-- ============================================================
-- Atomic invoice creation
-- Invoice + items + stock outs + invoice number = one transaction
-- Run in: Supabase → SQL Editor → New query → Run
-- ============================================================

create or replace function public.create_invoice_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_prefix text := coalesce(nullif(payload->>'prefix', ''), 'AURA');
  v_customer_id uuid;
  v_invoice_date date;
  v_notes text;
  v_invoice_number text;
  v_invoice_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_stock integer;
  v_product_name text;
  v_invoice public.invoices%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Invoice must have at least one line item';
  end if;

  v_customer_id := (payload->>'customer_id')::uuid;
  v_invoice_date := coalesce((payload->>'invoice_date')::date, current_date);
  v_notes := nullif(payload->>'notes', '');

  if not exists (select 1 from public.customers where id = v_customer_id) then
    raise exception 'Customer not found';
  end if;

  -- Stock check (same transaction as deduction)
  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select coalesce(sum(sm.quantity), 0)::integer, p.name
      into v_stock, v_product_name
    from public.products p
    left join public.stock_movements sm on sm.product_id = p.id
    where p.id = v_product_id
    group by p.id, p.name;

    if v_product_name is null then
      raise exception 'Product not found: %', v_product_id;
    end if;

    if v_stock < v_qty then
      raise exception 'Insufficient stock for % (have %, need %)',
        v_product_name, v_stock, v_qty;
    end if;
  end loop;

  -- Number allocated INSIDE this transaction — rolls back on any later failure
  v_invoice_number := public.next_invoice_number(v_prefix);

  insert into public.invoices (
    invoice_number,
    customer_id,
    invoice_date,
    subtotal,
    total_cgst,
    total_sgst,
    total_igst,
    round_off,
    grand_total,
    status,
    notes,
    created_by
  ) values (
    v_invoice_number,
    v_customer_id,
    v_invoice_date,
    coalesce((payload->>'subtotal')::numeric, 0),
    coalesce((payload->>'total_cgst')::numeric, 0),
    coalesce((payload->>'total_sgst')::numeric, 0),
    coalesce((payload->>'total_igst')::numeric, 0),
    coalesce((payload->>'round_off')::numeric, 0),
    coalesce((payload->>'grand_total')::numeric, 0),
    'issued',
    v_notes,
    coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id)
  )
  returning * into v_invoice;

  v_invoice_id := v_invoice.id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    insert into public.invoice_items (
      invoice_id,
      product_id,
      hsn_code,
      quantity,
      unit_price,
      price_overridden,
      taxable_value,
      gst_rate,
      cgst_amount,
      sgst_amount,
      igst_amount,
      line_total
    ) values (
      v_invoice_id,
      (v_item->>'product_id')::uuid,
      v_item->>'hsn_code',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'price_overridden')::boolean, false),
      (v_item->>'taxable_value')::numeric,
      (v_item->>'gst_rate')::numeric,
      coalesce((v_item->>'cgst_amount')::numeric, 0),
      coalesce((v_item->>'sgst_amount')::numeric, 0),
      coalesce((v_item->>'igst_amount')::numeric, 0),
      (v_item->>'line_total')::numeric
    );

    insert into public.stock_movements (
      product_id,
      movement_type,
      quantity,
      reference,
      reason,
      created_by
    ) values (
      (v_item->>'product_id')::uuid,
      'out',
      -abs((v_item->>'quantity')::integer),
      v_invoice_number,
      'Invoice ' || v_invoice_number,
      coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id)
    );
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

grant execute on function public.create_invoice_atomic(jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
