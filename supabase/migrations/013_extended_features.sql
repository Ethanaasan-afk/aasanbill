-- ============================================================
-- Extended features: barcode, UPI, warehouses, suppliers,
-- purchases, credit notes + warehouse-aware invoice stock
-- ============================================================

-- ---------- PRODUCTS: barcode ----------
alter table public.products
  add column if not exists barcode text;

create index if not exists products_barcode_idx
  on public.products (barcode)
  where barcode is not null and barcode <> '';

-- ---------- COMPANY: UPI ----------
alter table public.company_settings
  add column if not exists upi_id text not null default '';

-- ---------- WAREHOUSES ----------
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.warehouses (name, code, address, is_default, is_active)
select 'Main warehouse', 'MAIN', '', true, true
where not exists (select 1 from public.warehouses where code = 'MAIN');

alter table public.stock_movements
  add column if not exists warehouse_id uuid references public.warehouses(id);

alter table public.invoices
  add column if not exists warehouse_id uuid references public.warehouses(id);

-- Backfill movements / invoices to default warehouse
update public.stock_movements sm
set warehouse_id = w.id
from public.warehouses w
where sm.warehouse_id is null and w.is_default = true;

update public.invoices inv
set warehouse_id = w.id
from public.warehouses w
where inv.warehouse_id is null and w.is_default = true;

-- Per-warehouse stock view (keeps original product_stock as global sum)
create or replace view public.product_stock_by_warehouse as
select
  product_id,
  warehouse_id,
  coalesce(sum(quantity), 0)::integer as current_stock
from public.stock_movements
group by product_id, warehouse_id;

-- ---------- SUPPLIERS ----------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  gstin text,
  address text,
  state text not null default 'Gujarat',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PURCHASES ----------
create table if not exists public.purchase_sequences (
  financial_year text primary key,
  last_number integer not null default 0
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  warehouse_id uuid references public.warehouses(id),
  purchase_date date not null default current_date,
  subtotal numeric(14, 2) not null default 0,
  total_cgst numeric(14, 2) not null default 0,
  total_sgst numeric(14, 2) not null default 0,
  total_igst numeric(14, 2) not null default 0,
  round_off numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,
  status text not null default 'received' check (status in ('received', 'cancelled')),
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id),
  hsn_code text not null default '',
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14, 2) not null default 0,
  taxable_value numeric(14, 2) not null default 0,
  gst_rate numeric(5, 2) not null default 0,
  cgst_amount numeric(14, 2) not null default 0,
  sgst_amount numeric(14, 2) not null default 0,
  igst_amount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0,
  batch_number text,
  mfg_date date,
  exp_date date
);

create or replace function public.next_purchase_number(p_prefix text default 'PO')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text;
  v_n integer;
begin
  v_fy := case
    when extract(month from current_date) >= 4
      then to_char(current_date, 'YY') || '-' || to_char(current_date + interval '1 year', 'YY')
    else to_char(current_date - interval '1 year', 'YY') || '-' || to_char(current_date, 'YY')
  end;

  insert into public.purchase_sequences (financial_year, last_number)
  values (v_fy, 1)
  on conflict (financial_year) do update
    set last_number = public.purchase_sequences.last_number + 1
  returning last_number into v_n;

  return p_prefix || '/' || v_fy || '/' || lpad(v_n::text, 4, '0');
end;
$$;

-- ---------- CREDIT NOTES ----------
create table if not exists public.credit_note_sequences (
  financial_year text primary key,
  last_number integer not null default 0
);

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null unique,
  invoice_id uuid not null references public.invoices(id),
  customer_id uuid not null references public.customers(id),
  warehouse_id uuid references public.warehouses(id),
  credit_date date not null default current_date,
  subtotal numeric(14, 2) not null default 0,
  total_cgst numeric(14, 2) not null default 0,
  total_sgst numeric(14, 2) not null default 0,
  total_igst numeric(14, 2) not null default 0,
  round_off numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,
  reason text,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.credit_note_items (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.credit_notes(id) on delete cascade,
  product_id uuid not null references public.products(id),
  hsn_code text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null default 0,
  taxable_value numeric(14, 2) not null default 0,
  gst_rate numeric(5, 2) not null default 0,
  cgst_amount numeric(14, 2) not null default 0,
  sgst_amount numeric(14, 2) not null default 0,
  igst_amount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null default 0
);

create or replace function public.next_credit_note_number(p_prefix text default 'CN')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text;
  v_n integer;
begin
  v_fy := case
    when extract(month from current_date) >= 4
      then to_char(current_date, 'YY') || '-' || to_char(current_date + interval '1 year', 'YY')
    else to_char(current_date - interval '1 year', 'YY') || '-' || to_char(current_date, 'YY')
  end;

  insert into public.credit_note_sequences (financial_year, last_number)
  values (v_fy, 1)
  on conflict (financial_year) do update
    set last_number = public.credit_note_sequences.last_number + 1
  returning last_number into v_n;

  return p_prefix || '/' || v_fy || '/' || lpad(v_n::text, 4, '0');
end;
$$;

-- ---------- RLS ----------
alter table public.warehouses enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_sequences enable row level security;
alter table public.credit_notes enable row level security;
alter table public.credit_note_items enable row level security;
alter table public.credit_note_sequences enable row level security;

drop policy if exists "warehouses_select" on public.warehouses;
create policy "warehouses_select" on public.warehouses for select to authenticated
  using (public.is_app_user());
drop policy if exists "warehouses_write" on public.warehouses;
create policy "warehouses_write" on public.warehouses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers for select to authenticated
  using (public.is_app_user());
drop policy if exists "suppliers_write" on public.suppliers;
create policy "suppliers_write" on public.suppliers for all to authenticated
  using (public.is_app_user()) with check (public.is_app_user());

drop policy if exists "purchases_select" on public.purchases;
create policy "purchases_select" on public.purchases for select to authenticated
  using (public.is_app_user());
drop policy if exists "purchases_write" on public.purchases;
create policy "purchases_write" on public.purchases for all to authenticated
  using (public.is_app_user()) with check (public.is_app_user());

drop policy if exists "purchase_items_select" on public.purchase_items;
create policy "purchase_items_select" on public.purchase_items for select to authenticated
  using (public.is_app_user());
drop policy if exists "purchase_items_write" on public.purchase_items;
create policy "purchase_items_write" on public.purchase_items for all to authenticated
  using (public.is_app_user()) with check (public.is_app_user());

drop policy if exists "purchase_seq_select" on public.purchase_sequences;
create policy "purchase_seq_select" on public.purchase_sequences for select to authenticated
  using (public.is_app_user());

drop policy if exists "credit_notes_select" on public.credit_notes;
create policy "credit_notes_select" on public.credit_notes for select to authenticated
  using (public.is_app_user());
drop policy if exists "credit_notes_write" on public.credit_notes;
create policy "credit_notes_write" on public.credit_notes for all to authenticated
  using (public.is_app_user()) with check (public.is_app_user());

drop policy if exists "credit_note_items_select" on public.credit_note_items;
create policy "credit_note_items_select" on public.credit_note_items for select to authenticated
  using (public.is_app_user());
drop policy if exists "credit_note_items_write" on public.credit_note_items;
create policy "credit_note_items_write" on public.credit_note_items for all to authenticated
  using (public.is_app_user()) with check (public.is_app_user());

drop policy if exists "credit_seq_select" on public.credit_note_sequences;
create policy "credit_seq_select" on public.credit_note_sequences for select to authenticated
  using (public.is_app_user());

grant execute on function public.next_purchase_number(text) to authenticated;
grant execute on function public.next_credit_note_number(text) to authenticated;

-- ---------- Warehouse-aware create_invoice_atomic ----------
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
  v_warehouse_id uuid;
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
  v_warehouse_id := nullif(payload->>'warehouse_id', '')::uuid;

  if v_warehouse_id is null then
    select id into v_warehouse_id from public.warehouses where is_default = true and is_active = true limit 1;
  end if;

  if not exists (select 1 from public.customers where id = v_customer_id) then
    raise exception 'Customer not found';
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select p.name into v_product_name from public.products p where p.id = v_product_id;
    if v_product_name is null then
      raise exception 'Product not found: %', v_product_id;
    end if;

    if v_warehouse_id is not null then
      select coalesce(sum(sm.quantity), 0)::integer into v_stock
      from public.stock_movements sm
      where sm.product_id = v_product_id and sm.warehouse_id = v_warehouse_id;
    else
      select coalesce(sum(sm.quantity), 0)::integer into v_stock
      from public.stock_movements sm
      where sm.product_id = v_product_id;
    end if;

    if v_stock < v_qty then
      raise exception 'Insufficient stock for % (have %, need %)',
        v_product_name, v_stock, v_qty;
    end if;
  end loop;

  v_invoice_number := public.next_invoice_number(v_prefix);

  insert into public.invoices (
    invoice_number, customer_id, invoice_date,
    subtotal, total_cgst, total_sgst, total_igst, round_off, grand_total,
    status, notes, created_by, warehouse_id
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
    v_warehouse_id
  )
  returning * into v_invoice;

  v_invoice_id := v_invoice.id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    insert into public.invoice_items (
      invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
      taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total
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
      product_id, movement_type, quantity, reference, reason, created_by, warehouse_id
    ) values (
      (v_item->>'product_id')::uuid,
      'out',
      -abs((v_item->>'quantity')::integer),
      v_invoice_number,
      'Invoice ' || v_invoice_number,
      coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id),
      v_warehouse_id
    );
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

select pg_notify('pgrst', 'reload schema');
