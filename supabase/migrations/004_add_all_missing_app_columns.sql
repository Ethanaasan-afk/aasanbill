-- ============================================================
-- 004_add_all_missing_app_columns.sql
-- Run ONCE in: Supabase → SQL Editor → New query → Run
-- Safe to re-run (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS)
-- ============================================================
-- Your live DB was likely created from a minimal schema. The app
-- writes more columns than that schema had. This file brings every
-- table up to what the code expects.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- USERS ----------
-- App writes: id, full_name, role
-- (created_at has default)
alter table public.users
  add column if not exists full_name text,
  add column if not exists role text,
  add column if not exists created_at timestamptz;

update public.users set full_name = coalesce(full_name, '') where full_name is null;
update public.users set role = coalesce(role, 'staff') where role is null;
update public.users set created_at = coalesce(created_at, now()) where created_at is null;

alter table public.users alter column role set default 'staff';
alter table public.users alter column created_at set default now();

-- ---------- COMPANY SETTINGS ----------
-- App reads/writes: company_name, brand_name, gstin, address, city, state,
--   pincode, phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
--   invoice_prefix, updated_at  (+ id for update)
alter table public.company_settings
  add column if not exists company_name text,
  add column if not exists brand_name text,
  add column if not exists gstin text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_branch text,
  add column if not exists invoice_prefix text,
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid;

update public.company_settings set company_name = coalesce(company_name, 'Laiba Lubricants Pvt. Ltd.');
update public.company_settings set brand_name = coalesce(brand_name, 'AURA Clean');
update public.company_settings set gstin = coalesce(gstin, '');
update public.company_settings set address = coalesce(address, '');
update public.company_settings set city = coalesce(city, '');
update public.company_settings set state = coalesce(state, 'Gujarat');
update public.company_settings set pincode = coalesce(pincode, '');
update public.company_settings set phone = coalesce(phone, '');
update public.company_settings set email = coalesce(email, '');
update public.company_settings set bank_name = coalesce(bank_name, '');
update public.company_settings set bank_account = coalesce(bank_account, '');
update public.company_settings set bank_ifsc = coalesce(bank_ifsc, '');
update public.company_settings set bank_branch = coalesce(bank_branch, '');
update public.company_settings set invoice_prefix = coalesce(invoice_prefix, 'AURA');
update public.company_settings set updated_at = coalesce(updated_at, now());

alter table public.company_settings alter column brand_name set default 'AURA Clean';
alter table public.company_settings alter column city set default '';
alter table public.company_settings alter column pincode set default '';
alter table public.company_settings alter column phone set default '';
alter table public.company_settings alter column email set default '';
alter table public.company_settings alter column bank_name set default '';
alter table public.company_settings alter column bank_account set default '';
alter table public.company_settings alter column bank_ifsc set default '';
alter table public.company_settings alter column bank_branch set default '';
alter table public.company_settings alter column invoice_prefix set default 'AURA';
alter table public.company_settings alter column updated_at set default now();

-- ---------- PRODUCTS ----------
-- App writes: name, category, variant, sku, pack_size, hsn_code,
--   base_price, gst_rate, reorder_threshold, is_active, image_url, updated_at
alter table public.products
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists variant text,
  add column if not exists sku text,
  add column if not exists pack_size text,
  add column if not exists hsn_code text,
  add column if not exists base_price numeric(10,2),
  add column if not exists gst_rate numeric(4,2),
  add column if not exists reorder_threshold integer,
  add column if not exists is_active boolean,
  add column if not exists image_url text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.products set reorder_threshold = coalesce(reorder_threshold, 10);
update public.products set is_active = coalesce(is_active, true);
update public.products set created_at = coalesce(created_at, now());
update public.products set updated_at = coalesce(updated_at, now());

alter table public.products alter column reorder_threshold set default 10;
alter table public.products alter column is_active set default true;
alter table public.products alter column created_at set default now();
alter table public.products alter column updated_at set default now();

-- ---------- PRICE HISTORY ----------
-- Written by trigger / app reads: product_id, old_price, new_price, changed_by, changed_at
alter table public.price_history
  add column if not exists product_id uuid,
  add column if not exists old_price numeric(10,2),
  add column if not exists new_price numeric(10,2),
  add column if not exists changed_by uuid,
  add column if not exists changed_at timestamptz;

alter table public.price_history alter column changed_at set default now();

-- ---------- STOCK MOVEMENTS ----------
-- App writes: product_id, movement_type, quantity, reference, reason,
--   batch_number, mfg_date, exp_date, created_by
alter table public.stock_movements
  add column if not exists product_id uuid,
  add column if not exists movement_type text,
  add column if not exists quantity integer,
  add column if not exists reference text,
  add column if not exists reason text,
  add column if not exists batch_number text,
  add column if not exists mfg_date date,
  add column if not exists exp_date date,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz;

alter table public.stock_movements alter column created_at set default now();

-- ---------- CUSTOMERS ----------
-- App writes: name, phone, email, billing_address, state, gstin, customer_type
alter table public.customers
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists billing_address text,
  add column if not exists state text,
  add column if not exists gstin text,
  add column if not exists customer_type text,
  add column if not exists created_at timestamptz;

update public.customers set customer_type = coalesce(customer_type, 'b2c');
update public.customers set created_at = coalesce(created_at, now());

alter table public.customers alter column customer_type set default 'b2c';
alter table public.customers alter column created_at set default now();

-- ---------- INVOICES ----------
-- App inserts: invoice_number, customer_id, invoice_date, subtotal,
--   total_cgst, total_sgst, total_igst, round_off, grand_total,
--   status, notes, created_by
-- App updates: status, cancelled_reason
alter table public.invoices
  add column if not exists invoice_number text,
  add column if not exists customer_id uuid,
  add column if not exists invoice_date date,
  add column if not exists subtotal numeric(10,2),
  add column if not exists total_cgst numeric(10,2),
  add column if not exists total_sgst numeric(10,2),
  add column if not exists total_igst numeric(10,2),
  add column if not exists round_off numeric(6,2),
  add column if not exists grand_total numeric(10,2),
  add column if not exists status text,
  add column if not exists cancelled_reason text,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz;

update public.invoices set total_cgst = coalesce(total_cgst, 0);
update public.invoices set total_sgst = coalesce(total_sgst, 0);
update public.invoices set total_igst = coalesce(total_igst, 0);
update public.invoices set round_off = coalesce(round_off, 0);
update public.invoices set status = coalesce(status, 'issued');
update public.invoices set invoice_date = coalesce(invoice_date, current_date);
update public.invoices set created_at = coalesce(created_at, now());

alter table public.invoices alter column total_cgst set default 0;
alter table public.invoices alter column total_sgst set default 0;
alter table public.invoices alter column total_igst set default 0;
alter table public.invoices alter column round_off set default 0;
alter table public.invoices alter column status set default 'issued';
alter table public.invoices alter column invoice_date set default current_date;
alter table public.invoices alter column created_at set default now();

-- ---------- INVOICE ITEMS ----------
-- App inserts: invoice_id, product_id, hsn_code, quantity, unit_price,
--   price_overridden, taxable_value, gst_rate, cgst_amount, sgst_amount,
--   igst_amount, line_total
alter table public.invoice_items
  add column if not exists invoice_id uuid,
  add column if not exists product_id uuid,
  add column if not exists hsn_code text,
  add column if not exists quantity integer,
  add column if not exists unit_price numeric(10,2),
  add column if not exists price_overridden boolean,
  add column if not exists taxable_value numeric(10,2),
  add column if not exists gst_rate numeric(4,2),
  add column if not exists cgst_amount numeric(10,2),
  add column if not exists sgst_amount numeric(10,2),
  add column if not exists igst_amount numeric(10,2),
  add column if not exists line_total numeric(10,2);

update public.invoice_items set price_overridden = coalesce(price_overridden, false);
update public.invoice_items set cgst_amount = coalesce(cgst_amount, 0);
update public.invoice_items set sgst_amount = coalesce(sgst_amount, 0);
update public.invoice_items set igst_amount = coalesce(igst_amount, 0);

alter table public.invoice_items alter column price_overridden set default false;
alter table public.invoice_items alter column cgst_amount set default 0;
alter table public.invoice_items alter column sgst_amount set default 0;
alter table public.invoice_items alter column igst_amount set default 0;

-- ---------- INVOICE SEQUENCES + RPC (required for Generate Invoice) ----------
create table if not exists public.invoice_sequences (
  financial_year text primary key,
  last_number integer not null default 0
);

alter table public.invoice_sequences enable row level security;

drop policy if exists "seq_select" on public.invoice_sequences;
create policy "seq_select" on public.invoice_sequences
  for select to authenticated
  using (auth.uid() is not null);

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
$$ language plpgsql security definer set search_path = public;

grant execute on function public.next_invoice_number(text) to authenticated;

-- ---------- PRODUCT STOCK VIEW ----------
create or replace view public.product_stock
with (security_invoker = true) as
select
  p.id as product_id,
  coalesce(sum(sm.quantity), 0)::integer as current_stock
from public.products p
left join public.stock_movements sm on sm.product_id = p.id
group by p.id;

grant select on public.product_stock to authenticated;

-- ---------- PRICE HISTORY TRIGGER (optional but expected) ----------
create or replace function public.log_price_change()
returns trigger as $$
begin
  if old.base_price is distinct from new.base_price then
    insert into public.price_history (product_id, old_price, new_price, changed_by)
    values (new.id, old.base_price, new.base_price, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists products_price_history on public.products;
create trigger products_price_history
  after update on public.products
  for each row execute function public.log_price_change();

-- ---------- Reload API schema cache ----------
select pg_notify('pgrst', 'reload schema');
