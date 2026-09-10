-- ============================================================
-- AURA Clean Billing — Full Supabase Schema
-- Run this ENTIRE file in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT)
-- ============================================================
-- Do NOT use a minimal schema: the app needs product_stock, invoice_sequences,
-- company letterhead fields, and price_overridden on invoice_items.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- USERS (extends auth.users) ----------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- Auto-create public.users when someone signs up via Auth
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_app_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid()
  );
$$;

-- ---------- COMPANY SETTINGS ----------
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Laiba Lubricants Pvt. Ltd.',
  brand_name text not null default 'AURA Clean',
  gstin text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default 'Gujarat',
  pincode text not null default '',
  phone text not null default '',
  email text not null default '',
  bank_name text not null default '',
  bank_account text not null default '',
  bank_ifsc text not null default '',
  bank_branch text not null default '',
  invoice_prefix text not null default 'AURA',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  variant text,
  sku text unique not null,
  pack_size text not null,
  hsn_code text not null,
  base_price numeric(10,2) not null check (base_price >= 0),
  gst_rate numeric(4,2) not null check (gst_rate in (5, 12, 18, 28)),
  reorder_threshold integer not null default 10,
  is_active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PRICE HISTORY ----------
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  old_price numeric(10,2),
  new_price numeric(10,2) not null,
  changed_by uuid references public.users(id),
  changed_at timestamptz not null default now()
);

-- ---------- PRODUCT PRICE TIERS (optional / unused in UI yet) ----------
create table if not exists public.product_price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_qty integer not null,
  max_qty integer,
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ---------- STOCK MOVEMENTS ----------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity integer not null,
  reference text,
  reason text,
  batch_number text,
  mfg_date date,
  exp_date date,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ---------- CUSTOMERS ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  billing_address text,
  state text not null,
  gstin text,
  customer_type text not null default 'b2c' check (customer_type in ('b2b', 'b2c')),
  created_at timestamptz not null default now()
);

-- ---------- INVOICE SEQUENCES ----------
create table if not exists public.invoice_sequences (
  financial_year text primary key,
  last_number integer not null default 0
);

-- ---------- INVOICES ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  customer_id uuid not null references public.customers(id),
  invoice_date date not null default current_date,
  subtotal numeric(10,2) not null,
  total_cgst numeric(10,2) not null default 0,
  total_sgst numeric(10,2) not null default 0,
  total_igst numeric(10,2) not null default 0,
  round_off numeric(6,2) not null default 0,
  grand_total numeric(10,2) not null,
  status text not null default 'issued' check (status in ('issued', 'paid', 'cancelled')),
  cancelled_reason text,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ---------- INVOICE ITEMS ----------
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid not null references public.products(id),
  hsn_code text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  price_overridden boolean not null default false,
  taxable_value numeric(10,2) not null,
  gst_rate numeric(4,2) not null,
  cgst_amount numeric(10,2) not null default 0,
  sgst_amount numeric(10,2) not null default 0,
  igst_amount numeric(10,2) not null default 0,
  line_total numeric(10,2) not null
);

-- ---------- STOCK VIEW (required by app) ----------
create or replace view public.product_stock
with (security_invoker = true) as
select
  p.id as product_id,
  coalesce(sum(sm.quantity), 0)::integer as current_stock
from public.products p
left join public.stock_movements sm on sm.product_id = p.id
group by p.id;

grant select on public.product_stock to authenticated;

-- ---------- INDEXES ----------
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_stock_movements_created on public.stock_movements(created_at desc);
create index if not exists idx_invoices_date on public.invoices(invoice_date desc);
create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_price_history_product on public.price_history(product_id);

-- ---------- TRIGGERS / FUNCTIONS ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.log_price_change()
returns trigger as $$
begin
  if old.base_price is distinct from new.base_price then
    insert into public.price_history (product_id, old_price, new_price, changed_by)
    values (new.id, old.base_price, new.base_price, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists products_price_history on public.products;
create trigger products_price_history
  after update on public.products
  for each row execute function public.log_price_change();

create or replace function public.get_financial_year(d date default current_date)
returns text as $$
declare
  y integer := extract(year from d)::integer;
  m integer := extract(month from d)::integer;
begin
  if m >= 4 then
    return y::text || '-' || right((y + 1)::text, 2);
  else
    return (y - 1)::text || '-' || right(y::text, 2);
  end if;
end;
$$ language plpgsql immutable;

create or replace function public.next_invoice_number(prefix text default 'AURA')
returns text as $$
declare
  fy text := public.get_financial_year(current_date);
  next_num integer;
begin
  insert into public.invoice_sequences (financial_year, last_number)
  values (fy, 1)
  on conflict (financial_year)
  do update set last_number = public.invoice_sequences.last_number + 1
  returning last_number into next_num;

  return prefix || '/' || fy || '/' || lpad(next_num::text, 4, '0');
end;
$$ language plpgsql security definer;

-- ---------- RLS ----------
alter table public.users enable row level security;
alter table public.company_settings enable row level security;
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.product_price_tiers enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customers enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- Drop then recreate policies (safe re-run)
drop policy if exists "users_select" on public.users;
drop policy if exists "users_insert_admin" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_delete_admin" on public.users;
drop policy if exists "users_admin_write" on public.users;

drop policy if exists "company_select" on public.company_settings;
drop policy if exists "company_insert_admin" on public.company_settings;
drop policy if exists "company_update_admin" on public.company_settings;
drop policy if exists "company_settings_select" on public.company_settings;
drop policy if exists "company_settings_admin_update" on public.company_settings;

drop policy if exists "products_select" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete_admin" on public.products;
drop policy if exists "products_admin_delete" on public.products;

drop policy if exists "price_history_select" on public.price_history;
drop policy if exists "price_history_insert" on public.price_history;

drop policy if exists "tiers_select" on public.product_price_tiers;
drop policy if exists "tiers_write_admin" on public.product_price_tiers;

drop policy if exists "stock_select" on public.stock_movements;
drop policy if exists "stock_insert" on public.stock_movements;
drop policy if exists "stock_movements_select" on public.stock_movements;
drop policy if exists "stock_movements_insert" on public.stock_movements;

drop policy if exists "customers_select" on public.customers;
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;
drop policy if exists "customers_delete_admin" on public.customers;

drop policy if exists "seq_select" on public.invoice_sequences;

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete_admin" on public.invoices;

drop policy if exists "items_select" on public.invoice_items;
drop policy if exists "items_insert" on public.invoice_items;
drop policy if exists "items_update_admin" on public.invoice_items;
drop policy if exists "items_delete_admin" on public.invoice_items;
drop policy if exists "invoice_items_select" on public.invoice_items;
drop policy if exists "invoice_items_insert" on public.invoice_items;

create policy "users_select" on public.users
  for select to authenticated using (auth.uid() is not null);
create policy "users_insert_admin" on public.users
  for insert to authenticated with check (public.is_admin());
create policy "users_update_admin" on public.users
  for update to authenticated using (public.is_admin());
create policy "users_delete_admin" on public.users
  for delete to authenticated using (public.is_admin());

create policy "company_select" on public.company_settings
  for select to authenticated using (public.is_app_user());
create policy "company_insert_admin" on public.company_settings
  for insert to authenticated with check (public.is_admin());
create policy "company_update_admin" on public.company_settings
  for update to authenticated using (public.is_admin());

create policy "products_select" on public.products
  for select to authenticated using (public.is_app_user());
create policy "products_insert" on public.products
  for insert to authenticated with check (public.is_app_user());
create policy "products_update" on public.products
  for update to authenticated using (public.is_app_user());
create policy "products_delete_admin" on public.products
  for delete to authenticated using (public.is_admin());

create policy "price_history_select" on public.price_history
  for select to authenticated using (public.is_app_user());
create policy "price_history_insert" on public.price_history
  for insert to authenticated with check (public.is_app_user());

create policy "tiers_select" on public.product_price_tiers
  for select to authenticated using (public.is_app_user());
create policy "tiers_write_admin" on public.product_price_tiers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "stock_select" on public.stock_movements
  for select to authenticated using (public.is_app_user());
create policy "stock_insert" on public.stock_movements
  for insert to authenticated with check (public.is_app_user());

create policy "customers_select" on public.customers
  for select to authenticated using (public.is_app_user());
create policy "customers_insert" on public.customers
  for insert to authenticated with check (public.is_app_user());
create policy "customers_update" on public.customers
  for update to authenticated using (public.is_app_user());
create policy "customers_delete_admin" on public.customers
  for delete to authenticated using (public.is_admin());

create policy "seq_select" on public.invoice_sequences
  for select to authenticated using (public.is_app_user());

create policy "invoices_select" on public.invoices
  for select to authenticated using (public.is_app_user());
create policy "invoices_insert" on public.invoices
  for insert to authenticated with check (public.is_app_user());
create policy "invoices_update" on public.invoices
  for update to authenticated using (public.is_app_user());
create policy "invoices_delete_admin" on public.invoices
  for delete to authenticated using (public.is_admin());

create policy "items_select" on public.invoice_items
  for select to authenticated using (public.is_app_user());
create policy "items_insert" on public.invoice_items
  for insert to authenticated with check (public.is_app_user());
create policy "items_update_admin" on public.invoice_items
  for update to authenticated using (public.is_admin());
create policy "items_delete_admin" on public.invoice_items
  for delete to authenticated using (public.is_admin());

-- ---------- SEED COMPANY (only if empty) ----------
insert into public.company_settings (
  company_name, brand_name, gstin, address, city, state, pincode, phone, email,
  bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix
)
select
  'Laiba Lubricants Pvt. Ltd.',
  'AURA Clean',
  '',
  '',
  '',
  'Gujarat',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'AURA'
where not exists (select 1 from public.company_settings limit 1);

-- ---------- SEED PRODUCTS (safe re-run) ----------
-- Adds core inventory items so they show up in Inventory → Stock in/out selectors.
-- Safe to re-run due to ON CONFLICT (sku) DO NOTHING.
insert into public.products (
  name,
  category,
  variant,
  sku,
  pack_size,
  hsn_code,
  base_price,
  gst_rate,
  reorder_threshold,
  is_active,
  image_url
)
values
  ('Handwash', 'Handwash', null, 'HANDWASH-1L', '1L', '34013000', 90, 18, 15, true, null),
  ('Toilet Cleaner', 'Toilet Cleaner', null, 'TOILET-CLEANER-1L', '1L', '34013000', 85, 18, 12, true, null),
  ('Car Wash', 'Car Wash', null, 'CAR-WASH-1L', '1L', '34025000', 140, 18, 10, true, null),
  ('Dish Wash', 'Dishwash', null, 'DISH-WASH-1L', '1L', '34022090', 120, 18, 15, true, null),
  ('Floor Cleaner', 'Floor Cleaner', null, 'FLOOR-CLEANER-1L', '1L', '34025000', 350, 18, 10, true, null),
  ('Clothe Wash', 'Liquid Detergent', null, 'CLOTHE-WASH-1L', '1L', '34022090', 175, 18, 20, true, null),
  ('Bathroom Cleaner', 'Bathroom Cleaner', null, 'BATHROOM-CLEANER-1L', '1L', '34029090', 90, 18, 12, true, null)
on conflict (sku) do nothing;

-- ============================================================
-- BOOTSTRAP (after first Auth user is created)
-- ============================================================
-- 1. Authentication → Users → Add user (email + password)
-- 2. Promote to admin (replace the UUID):
--
--    update public.users
--    set role = 'admin', full_name = 'Your Name'
--    where id = '<auth-user-uuid>';
--
-- 3. Put keys in .env.local and set DEMO_MODE=false / NEXT_PUBLIC_DEMO_MODE=false
-- 4. Restart: npm run dev
