-- ============================================================
-- PASTE into Supabase SQL Editor (once)
-- Jewellery shop: metal_rates + weight/rate product & invoice snapshots
-- Safe to re-run (idempotent where possible).
-- ============================================================

-- 1) Allow jewellery business_type
alter table public.organizations drop constraint if exists organizations_business_type_check;
alter table public.organizations
  add constraint organizations_business_type_check
  check (business_type in (
    'grocery', 'mobile_shop', 'pharmacy', 'cloth_shop',
    'service_freelancer', 'jewellery', 'general'
  ));

-- 2) GST 3% for precious metal jewellery (HSN 7113)
do $$ begin
  alter table public.products drop constraint if exists products_gst_rate_check;
exception when undefined_object then null;
end $$;

alter table public.products
  drop constraint if exists products_gst_rate_check;

alter table public.products
  add constraint products_gst_rate_check
  check (gst_rate in (3, 5, 12, 18, 28));

-- 3) Product jewellery catalog columns
alter table public.products
  add column if not exists metal_type text,
  add column if not exists purity text,
  add column if not exists huid_number text,
  add column if not exists gross_weight numeric(12,3),
  add column if not exists net_weight numeric(12,3),
  add column if not exists making_charge_type text,
  add column if not exists making_charge_value numeric(12,2) default 0,
  add column if not exists stone_value numeric(12,2) default 0;

do $$ begin
  alter table public.products drop constraint if exists products_metal_type_check;
exception when undefined_object then null;
end $$;

alter table public.products drop constraint if exists products_metal_type_check;
alter table public.products
  add constraint products_metal_type_check
  check (metal_type is null or metal_type in ('gold', 'silver'));

alter table public.products drop constraint if exists products_making_charge_type_check;
alter table public.products
  add constraint products_making_charge_type_check
  check (
    making_charge_type is null
    or making_charge_type in ('flat', 'per_gram', 'percent')
  );

comment on column public.products.metal_type is
  'Jewellery only: gold | silver. Null for fixed-price products.';
comment on column public.products.net_weight is
  'Jewellery: metal-only weight in grams (excl. stones).';

-- 4) Invoice line snapshots (rate charged at bill time)
alter table public.invoice_items
  add column if not exists metal_rate_used numeric(12,2),
  add column if not exists gross_weight numeric(12,3),
  add column if not exists net_weight numeric(12,3),
  add column if not exists making_charge_amount numeric(12,2),
  add column if not exists stone_value numeric(12,2),
  add column if not exists jewellery_purity text,
  add column if not exists jewellery_huid text;

-- 5) Daily metal rates
create table if not exists public.metal_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  metal_type text not null check (metal_type in ('gold', 'silver')),
  purity text not null,
  rate_per_gram numeric(12,2) not null check (rate_per_gram >= 0),
  effective_date date not null default (current_date),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists metal_rates_org_lookup_idx
  on public.metal_rates (organization_id, metal_type, purity, effective_date desc, created_at desc);

alter table public.metal_rates enable row level security;

drop policy if exists "metal_rates_select" on public.metal_rates;
drop policy if exists "metal_rates_insert" on public.metal_rates;
drop policy if exists "metal_rates_update" on public.metal_rates;
drop policy if exists "metal_rates_delete" on public.metal_rates;

create policy "metal_rates_select" on public.metal_rates
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy "metal_rates_insert" on public.metal_rates
  for insert to authenticated
  with check (organization_id = public.current_org_id());

create policy "metal_rates_update" on public.metal_rates
  for update to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy "metal_rates_delete" on public.metal_rates
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- 6) create_invoice_atomic — persist jewellery snapshot columns
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
      organization_id, imei_serial, batch_number, variant_tag,
      metal_rate_used, gross_weight, net_weight, making_charge_amount, stone_value,
      jewellery_purity, jewellery_huid
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
      nullif(trim(coalesce(v_item->>'variant_tag', '')), ''),
      nullif(v_item->>'metal_rate_used', '')::numeric,
      nullif(v_item->>'gross_weight', '')::numeric,
      nullif(v_item->>'net_weight', '')::numeric,
      nullif(v_item->>'making_charge_amount', '')::numeric,
      nullif(v_item->>'stone_value', '')::numeric,
      nullif(trim(coalesce(v_item->>'jewellery_purity', '')), ''),
      nullif(trim(coalesce(v_item->>'jewellery_huid', '')), '')
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

-- 7) update_invoice_atomic — same jewellery columns
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
      organization_id, imei_serial, batch_number, variant_tag,
      metal_rate_used, gross_weight, net_weight, making_charge_amount, stone_value,
      jewellery_purity, jewellery_huid
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
      nullif(trim(coalesce(v_item->>'variant_tag', '')), ''),
      nullif(v_item->>'metal_rate_used', '')::numeric,
      nullif(v_item->>'gross_weight', '')::numeric,
      nullif(v_item->>'net_weight', '')::numeric,
      nullif(v_item->>'making_charge_amount', '')::numeric,
      nullif(v_item->>'stone_value', '')::numeric,
      nullif(trim(coalesce(v_item->>'jewellery_purity', '')), ''),
      nullif(trim(coalesce(v_item->>'jewellery_huid', '')), '')
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
