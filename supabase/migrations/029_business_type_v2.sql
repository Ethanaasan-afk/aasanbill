-- Business type v2: text column with simplified verticals + product batch/is_service.
-- Safe to re-run. Remaps legacy enum values; existing grocery_kirana → general.

-- 1) Convert organizations.business_type from enum → text and remap
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'business_type'
  ) then
    alter table public.organizations alter column business_type drop default;

    -- If still enum-typed, cast via text
    begin
      alter table public.organizations
        alter column business_type type text
        using (
          case business_type::text
            when 'grocery_kirana' then 'general'
            when 'general_store' then 'general'
            when 'manufacturer_trader' then 'general'
            when 'cloth_shop_lite' then 'cloth_shop'
            when 'freelancer' then 'service_freelancer'
            when 'grocery' then 'grocery'
            when 'mobile_shop' then 'mobile_shop'
            when 'pharmacy' then 'pharmacy'
            when 'cloth_shop' then 'cloth_shop'
            when 'service_freelancer' then 'service_freelancer'
            when 'general' then 'general'
            else 'general'
          end
        );
    exception
      when others then
        -- Already text: remap in place
        update public.organizations set business_type = case business_type
          when 'grocery_kirana' then 'general'
          when 'general_store' then 'general'
          when 'manufacturer_trader' then 'general'
          when 'cloth_shop_lite' then 'cloth_shop'
          when 'freelancer' then 'service_freelancer'
          else business_type
        end;
    end;
  else
    alter table public.organizations
      add column business_type text not null default 'general';
  end if;
end $$;

alter table public.organizations
  alter column business_type set default 'general';

update public.organizations
set business_type = 'general'
where business_type is null
   or business_type not in (
     'grocery', 'mobile_shop', 'pharmacy', 'cloth_shop', 'service_freelancer', 'general'
   );

alter table public.organizations
  alter column business_type set not null;

alter table public.organizations drop constraint if exists organizations_business_type_check;
alter table public.organizations
  add constraint organizations_business_type_check
  check (
    business_type in (
      'grocery', 'mobile_shop', 'pharmacy', 'cloth_shop', 'service_freelancer', 'general'
    )
  );

comment on column public.organizations.business_type is
  'Vertical config (text). Default general — no vertical extras.';

-- Drop unused enum type only if nothing references it (no cascade)
do $$
begin
  drop type if exists public.business_type;
exception
  when dependent_objects_still_exist then null;
  when undefined_object then null;
end $$;

-- 2) Product catalog extras
alter table public.products
  add column if not exists batch_number text,
  add column if not exists is_service boolean not null default false;

comment on column public.products.batch_number is
  'Pharmacy — optional batch on the catalog item; copied to invoice lines.';
comment on column public.products.is_service is
  'When true, skip stock check/deduction on invoice (freelancer services).';

-- 3) Invoice line extras (idempotent)
alter table public.invoice_items
  add column if not exists imei_serial text,
  add column if not exists batch_number text,
  add column if not exists variant_tag text;

-- 4) create_invoice_atomic — skip stock for is_service products
create or replace function public.create_invoice_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org uuid := public.current_org_id();
  v_prefix text := coalesce(nullif(payload->>'prefix', ''), 'AB');
  v_customer_id uuid;
  v_invoice_date date;
  v_notes text;
  v_warehouse_id uuid;
  v_invoice_number text;
  v_invoice_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_stock integer;
  v_product_name text;
  v_is_service boolean;
  v_invoice public.invoices%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_org is null then
    raise exception 'No organization for current user';
  end if;

  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Invoice must have at least one line item';
  end if;

  v_customer_id := (payload->>'customer_id')::uuid;
  v_invoice_date := coalesce((payload->>'invoice_date')::date, current_date);
  v_notes := nullif(payload->>'notes', '');
  v_warehouse_id := nullif(payload->>'warehouse_id', '')::uuid;

  if v_warehouse_id is null then
    select id into v_warehouse_id
    from public.warehouses
    where is_default = true and is_active = true and organization_id = v_org
    limit 1;
  else
    if not exists (
      select 1 from public.warehouses
      where id = v_warehouse_id and organization_id = v_org
    ) then
      raise exception 'Warehouse not found';
    end if;
  end if;

  if not exists (
    select 1 from public.customers
    where id = v_customer_id and organization_id = v_org
  ) then
    raise exception 'Customer not found';
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select p.name, coalesce(p.is_service, false)
      into v_product_name, v_is_service
    from public.products p
    where p.id = v_product_id and p.organization_id = v_org;
    if v_product_name is null then
      raise exception 'Product not found: %', v_product_id;
    end if;

    if not v_is_service then
      if v_warehouse_id is not null then
        select coalesce(sum(sm.quantity), 0)::integer into v_stock
        from public.stock_movements sm
        where sm.product_id = v_product_id
          and sm.warehouse_id = v_warehouse_id
          and sm.organization_id = v_org;
      else
        select coalesce(sum(sm.quantity), 0)::integer into v_stock
        from public.stock_movements sm
        where sm.product_id = v_product_id and sm.organization_id = v_org;
      end if;

      if v_stock < v_qty then
        raise exception 'Insufficient stock for % (have %, need %)',
          v_product_name, v_stock, v_qty;
      end if;
    end if;
  end loop;

  v_invoice_number := public.next_invoice_number(v_prefix);

  insert into public.invoices (
    invoice_number, customer_id, invoice_date,
    subtotal, total_cgst, total_sgst, total_igst, round_off, grand_total,
    status, notes, created_by, warehouse_id, organization_id
  ) values (
    v_invoice_number, v_customer_id, v_invoice_date,
    coalesce((payload->>'subtotal')::numeric, 0),
    coalesce((payload->>'total_cgst')::numeric, 0),
    coalesce((payload->>'total_sgst')::numeric, 0),
    coalesce((payload->>'total_igst')::numeric, 0),
    coalesce((payload->>'round_off')::numeric, 0),
    coalesce((payload->>'grand_total')::numeric, 0),
    'issued', v_notes,
    coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id),
    v_warehouse_id,
    v_org
  )
  returning * into v_invoice;

  v_invoice_id := v_invoice.id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    insert into public.invoice_items (
      invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
      taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
      organization_id, imei_serial, batch_number, variant_tag
    ) values (
      v_invoice_id,
      v_product_id,
      v_item->>'hsn_code',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'price_overridden')::boolean, false),
      (v_item->>'taxable_value')::numeric,
      (v_item->>'gst_rate')::numeric,
      coalesce((v_item->>'cgst_amount')::numeric, 0),
      coalesce((v_item->>'sgst_amount')::numeric, 0),
      coalesce((v_item->>'igst_amount')::numeric, 0),
      (v_item->>'line_total')::numeric,
      v_org,
      nullif(trim(coalesce(v_item->>'imei_serial', '')), ''),
      nullif(trim(coalesce(v_item->>'batch_number', '')), ''),
      nullif(trim(coalesce(v_item->>'variant_tag', '')), '')
    );

    select coalesce(p.is_service, false) into v_is_service
    from public.products p
    where p.id = v_product_id and p.organization_id = v_org;

    if not coalesce(v_is_service, false) then
      insert into public.stock_movements (
        product_id, movement_type, quantity, reference, reason, created_by,
        warehouse_id, organization_id
      ) values (
        v_product_id,
        'out',
        -abs((v_item->>'quantity')::integer),
        v_invoice_number,
        'Invoice ' || v_invoice_number,
        coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id),
        v_warehouse_id,
        v_org
      );
    end if;
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

-- 5) update_invoice_atomic — same is_service skip
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
  v_org uuid := public.current_org_id();
  v_invoice public.invoices%rowtype;
  v_customer_id uuid;
  v_invoice_date date;
  v_notes text;
  v_warehouse_id uuid;
  v_force boolean := coalesce((payload->>'force')::boolean, false);
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_stock integer;
  v_product_name text;
  v_is_service boolean;
  v_old_number text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_org is null then
    raise exception 'No organization for current user';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id and organization_id = v_org
  for update;
  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status <> 'issued' and not v_force then
    raise exception 'Only issued invoices can be edited (status=%)', v_invoice.status;
  end if;

  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Invoice must have at least one line item';
  end if;

  v_customer_id := (payload->>'customer_id')::uuid;
  v_invoice_date := coalesce((payload->>'invoice_date')::date, v_invoice.invoice_date);
  v_notes := nullif(payload->>'notes', '');
  v_warehouse_id := coalesce(
    nullif(payload->>'warehouse_id', '')::uuid,
    v_invoice.warehouse_id
  );

  if v_warehouse_id is null then
    select id into v_warehouse_id
    from public.warehouses
    where is_default = true and is_active = true and organization_id = v_org
    limit 1;
  end if;

  v_old_number := v_invoice.invoice_number;

  delete from public.stock_movements
  where reference = v_old_number
    and organization_id = v_org
    and (
      (movement_type = 'out' and reason like 'Invoice %')
      or (movement_type = 'in' and reason like 'Void restore%')
    );

  delete from public.invoice_items where invoice_id = p_invoice_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select p.name, coalesce(p.is_service, false)
      into v_product_name, v_is_service
    from public.products p
    where p.id = v_product_id and p.organization_id = v_org;
    if v_product_name is null then
      raise exception 'Product not found: %', v_product_id;
    end if;

    if not v_is_service then
      if v_warehouse_id is not null then
        select coalesce(sum(sm.quantity), 0)::integer into v_stock
        from public.stock_movements sm
        where sm.product_id = v_product_id
          and sm.warehouse_id = v_warehouse_id
          and sm.organization_id = v_org;
      else
        select coalesce(sum(sm.quantity), 0)::integer into v_stock
        from public.stock_movements sm
        where sm.product_id = v_product_id and sm.organization_id = v_org;
      end if;

      if v_stock < v_qty then
        raise exception 'Insufficient stock for % (have %, need %)',
          v_product_name, v_stock, v_qty;
      end if;
    end if;
  end loop;

  update public.invoices set
    customer_id = v_customer_id,
    invoice_date = v_invoice_date,
    notes = v_notes,
    warehouse_id = v_warehouse_id,
    subtotal = coalesce((payload->>'subtotal')::numeric, 0),
    total_cgst = coalesce((payload->>'total_cgst')::numeric, 0),
    total_sgst = coalesce((payload->>'total_sgst')::numeric, 0),
    total_igst = coalesce((payload->>'total_igst')::numeric, 0),
    round_off = coalesce((payload->>'round_off')::numeric, 0),
    grand_total = coalesce((payload->>'grand_total')::numeric, 0),
    edited_at = now(),
    edited_by = coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id)
  where id = p_invoice_id and organization_id = v_org
  returning * into v_invoice;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    insert into public.invoice_items (
      invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
      taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
      organization_id, imei_serial, batch_number, variant_tag
    ) values (
      p_invoice_id,
      v_product_id,
      v_item->>'hsn_code',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'price_overridden')::boolean, false),
      (v_item->>'taxable_value')::numeric,
      (v_item->>'gst_rate')::numeric,
      coalesce((v_item->>'cgst_amount')::numeric, 0),
      coalesce((v_item->>'sgst_amount')::numeric, 0),
      coalesce((v_item->>'igst_amount')::numeric, 0),
      (v_item->>'line_total')::numeric,
      v_org,
      nullif(trim(coalesce(v_item->>'imei_serial', '')), ''),
      nullif(trim(coalesce(v_item->>'batch_number', '')), ''),
      nullif(trim(coalesce(v_item->>'variant_tag', '')), '')
    );

    select coalesce(p.is_service, false) into v_is_service
    from public.products p
    where p.id = v_product_id and p.organization_id = v_org;

    if not coalesce(v_is_service, false) then
      insert into public.stock_movements (
        product_id, movement_type, quantity, reference, reason, created_by,
        warehouse_id, organization_id
      ) values (
        v_product_id,
        'out',
        -abs((v_item->>'quantity')::integer),
        v_invoice.invoice_number,
        'Invoice ' || v_invoice.invoice_number,
        coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id),
        v_warehouse_id,
        v_org
      );
    end if;
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

grant execute on function public.create_invoice_atomic(jsonb) to authenticated;
grant execute on function public.update_invoice_atomic(uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
