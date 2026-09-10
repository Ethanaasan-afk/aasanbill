-- ============================================================
-- Atomic invoice update + edited_at / edited_by on invoices
-- Run in: Supabase → SQL Editor → New query → Run
-- ============================================================

alter table public.invoices
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.users(id);

create or replace function public.update_invoice_atomic(
  p_invoice_id uuid,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_force boolean := coalesce((payload->>'force')::boolean, false);
  v_is_admin boolean;
  v_invoice public.invoices%rowtype;
  v_customer_id uuid;
  v_invoice_date date;
  v_notes text;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_stock integer;
  v_product_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.users where id = v_user_id and role = 'admin'
  ) into v_is_admin;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status <> 'issued' then
    if not (v_force and v_is_admin) then
      raise exception 'Only issued invoices can be edited (status=%)', v_invoice.status;
    end if;
  end if;

  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Invoice must have at least one line item';
  end if;

  v_customer_id := (payload->>'customer_id')::uuid;
  v_invoice_date := coalesce((payload->>'invoice_date')::date, v_invoice.invoice_date);
  v_notes := nullif(payload->>'notes', '');

  if not exists (select 1 from public.customers where id = v_customer_id) then
    raise exception 'Customer not found';
  end if;

  -- Reverse stock tied to this invoice BEFORE checking new quantities:
  -- remove original outs and any void-restore ins for this invoice number
  delete from public.stock_movements
  where reference = v_invoice.invoice_number
    and (
      (movement_type = 'out' and reason like 'Invoice %')
      or (movement_type = 'in' and reason like 'Void restore%')
    );

  delete from public.invoice_items where invoice_id = p_invoice_id;

  -- Stock check against restored live balances
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

  update public.invoices set
    customer_id = v_customer_id,
    invoice_date = v_invoice_date,
    subtotal = coalesce((payload->>'subtotal')::numeric, 0),
    total_cgst = coalesce((payload->>'total_cgst')::numeric, 0),
    total_sgst = coalesce((payload->>'total_sgst')::numeric, 0),
    total_igst = coalesce((payload->>'total_igst')::numeric, 0),
    round_off = coalesce((payload->>'round_off')::numeric, 0),
    grand_total = coalesce((payload->>'grand_total')::numeric, 0),
    notes = v_notes,
    edited_at = now(),
    edited_by = coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id)
  where id = p_invoice_id
  returning * into v_invoice;

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
      p_invoice_id,
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
      v_invoice.invoice_number,
      'Invoice ' || v_invoice.invoice_number,
      coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id)
    );
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

grant execute on function public.update_invoice_atomic(uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
