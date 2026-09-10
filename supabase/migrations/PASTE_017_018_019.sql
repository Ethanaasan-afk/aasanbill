-- ################################################################
-- RUN ORDER: paste EACH section separately into Supabase SQL Editor
--   1) SECTION 017
--   2) SECTION 018
--   3) SECTION 019
-- ################################################################



-- ========== SECTION 017 — run this first ==========

-- ============================================================
-- Phase 1 / Step 2: organization_id on all tenant tables
-- Requires 016_organizations.sql (aura-clean org must exist).
-- ============================================================

-- ---------- organizations: subscription_status ----------
alter table public.organizations
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'cancelled'));

update public.organizations
set
  plan = 'business',
  subscription_status = 'active',
  trial_ends_at = coalesce(trial_ends_at, now() + interval '365 days')
where slug = 'aura-clean';

-- Resolve AURA Clean org id for backfill
do $$
declare
  v_org uuid;
begin
  select id into v_org from public.organizations where slug = 'aura-clean' limit 1;
  if v_org is null then
    raise exception 'organizations row with slug aura-clean not found. Run 016_organizations.sql first.';
  end if;

  -- helper: add column if missing (idempotent via IF NOT EXISTS below)
  null;
end $$;

-- ---------- Add organization_id columns (only when table exists) ----------
do $$
declare
  t text;
  tables text[] := array[
    'users', 'products', 'price_history', 'product_price_tiers', 'stock_movements',
    'customers', 'invoices', 'invoice_items', 'business_data_entries',
    'product_costs', 'other_expenses', 'warehouses', 'suppliers',
    'purchases', 'purchase_items', 'credit_notes', 'credit_note_items',
    'invoice_sequences', 'purchase_sequences', 'credit_note_sequences',
    'company_settings'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'alter table public.%I add column if not exists organization_id uuid references public.organizations(id)',
        t
      );
    end if;
  end loop;
end $$;

-- ---------- Backfill to aura-clean ----------
do $$
declare
  v_org uuid;
  t text;
  tables text[] := array[
    'users', 'products', 'customers', 'invoices', 'invoice_items',
    'stock_movements', 'price_history', 'product_price_tiers',
    'business_data_entries', 'product_costs', 'other_expenses',
    'warehouses', 'suppliers', 'purchases', 'purchase_items',
    'credit_notes', 'credit_note_items',
    'invoice_sequences', 'purchase_sequences', 'credit_note_sequences',
    'company_settings'
  ];
begin
  select id into v_org from public.organizations where slug = 'aura-clean' limit 1;
  if v_org is null then
    raise exception 'organizations row with slug aura-clean not found. Run 016_organizations.sql first.';
  end if;

  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'update public.%I set organization_id = $1 where organization_id is null',
        t
      ) using v_org;
    end if;
  end loop;
end $$;

-- ---------- NOT NULL on core tables (skip if table missing) ----------
do $$
declare
  t text;
  core text[] := array[
    'users', 'products', 'customers', 'invoices', 'invoice_items',
    'stock_movements', 'price_history', 'warehouses', 'suppliers',
    'purchases', 'purchase_items', 'credit_notes', 'credit_note_items',
    'business_data_entries', 'invoice_sequences', 'purchase_sequences',
    'credit_note_sequences'
  ];
begin
  foreach t in array core loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'alter table public.%I alter column organization_id set not null',
        t
      );
    end if;
  end loop;
end $$;

-- product_price_tiers / legacy cost tables: set NOT NULL if fully populated
do $$
begin
  if not exists (select 1 from public.product_price_tiers where organization_id is null) then
    alter table public.product_price_tiers alter column organization_id set not null;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='product_costs')
     and not exists (select 1 from public.product_costs where organization_id is null) then
    alter table public.product_costs alter column organization_id set not null;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='other_expenses')
     and not exists (select 1 from public.other_expenses where organization_id is null) then
    alter table public.other_expenses alter column organization_id set not null;
  end if;
end $$;

-- ---------- Per-tenant uniqueness (skip if table missing) ----------
do $$
begin
  if to_regclass('public.products') is not null then
    alter table public.products drop constraint if exists products_sku_key;
    drop index if exists products_sku_key;
    create unique index if not exists products_org_sku_uidx
      on public.products (organization_id, sku);
  end if;

  if to_regclass('public.warehouses') is not null then
    alter table public.warehouses drop constraint if exists warehouses_code_key;
    drop index if exists warehouses_code_key;
    create unique index if not exists warehouses_org_code_uidx
      on public.warehouses (organization_id, code);
  end if;

  if to_regclass('public.invoices') is not null then
    alter table public.invoices drop constraint if exists invoices_invoice_number_key;
    drop index if exists invoices_invoice_number_key;
    create unique index if not exists invoices_org_number_uidx
      on public.invoices (organization_id, invoice_number);
  end if;

  if to_regclass('public.purchases') is not null then
    alter table public.purchases drop constraint if exists purchases_purchase_number_key;
    drop index if exists purchases_purchase_number_key;
    create unique index if not exists purchases_org_number_uidx
      on public.purchases (organization_id, purchase_number);
  end if;

  if to_regclass('public.credit_notes') is not null then
    alter table public.credit_notes drop constraint if exists credit_notes_credit_note_number_key;
    drop index if exists credit_notes_credit_note_number_key;
    create unique index if not exists credit_notes_org_number_uidx
      on public.credit_notes (organization_id, credit_note_number);
  end if;

  if to_regclass('public.invoice_sequences') is not null then
    alter table public.invoice_sequences drop constraint if exists invoice_sequences_pkey;
    alter table public.invoice_sequences
      add constraint invoice_sequences_pkey primary key (organization_id, financial_year);
  end if;

  if to_regclass('public.purchase_sequences') is not null then
    alter table public.purchase_sequences drop constraint if exists purchase_sequences_pkey;
    alter table public.purchase_sequences
      add constraint purchase_sequences_pkey primary key (organization_id, financial_year);
  end if;

  if to_regclass('public.credit_note_sequences') is not null then
    alter table public.credit_note_sequences drop constraint if exists credit_note_sequences_pkey;
    alter table public.credit_note_sequences
      add constraint credit_note_sequences_pkey primary key (organization_id, financial_year);
  end if;
end $$;

create index if not exists users_organization_id_idx on public.users (organization_id);
create index if not exists products_organization_id_idx on public.products (organization_id);
create index if not exists customers_organization_id_idx on public.customers (organization_id);
create index if not exists invoices_organization_id_idx on public.invoices (organization_id);

select pg_notify('pgrst', 'reload schema');


-- ========== SECTION 018 — run after 017 succeeds ==========

-- ============================================================
-- Phase 1 / Step 3: org-scoped RLS via current_org_id()
-- Requires 017_organization_id_columns.sql
-- Safe if some optional tables are missing.
-- ============================================================

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

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid()
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_app_user() to authenticated;
grant execute on function public.current_org_id() to authenticated;

-- ---------- organizations ----------
drop policy if exists "organizations_select" on public.organizations;
drop policy if exists "organizations_insert_admin" on public.organizations;
drop policy if exists "organizations_update_admin" on public.organizations;
drop policy if exists "organizations_insert" on public.organizations;
drop policy if exists "organizations_update" on public.organizations;

create policy "organizations_select" on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

create policy "organizations_update" on public.organizations
  for update to authenticated
  using (id = public.current_org_id() and public.is_admin())
  with check (id = public.current_org_id() and public.is_admin());

-- ---------- users ----------
drop policy if exists "users_select" on public.users;
drop policy if exists "users_insert_admin" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_delete_admin" on public.users;
drop policy if exists "users_admin_write" on public.users;

create policy "users_select" on public.users
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy "users_insert_admin" on public.users
  for insert to authenticated
  with check (organization_id = public.current_org_id() and public.is_admin());

create policy "users_update_admin" on public.users
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

create policy "users_delete_admin" on public.users
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- ---------- products ----------
drop policy if exists "products_select" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete_admin" on public.products;
drop policy if exists "products_admin_delete" on public.products;

create policy "products_select" on public.products
  for select to authenticated using (organization_id = public.current_org_id());
create policy "products_insert" on public.products
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "products_update" on public.products
  for update to authenticated using (organization_id = public.current_org_id());
create policy "products_delete_admin" on public.products
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- ---------- price_history ----------
drop policy if exists "price_history_select" on public.price_history;
drop policy if exists "price_history_insert" on public.price_history;

create policy "price_history_select" on public.price_history
  for select to authenticated using (organization_id = public.current_org_id());
create policy "price_history_insert" on public.price_history
  for insert to authenticated with check (organization_id = public.current_org_id());

-- ---------- product_price_tiers ----------
do $$ begin
  if to_regclass('public.product_price_tiers') is null then return; end if;
  execute 'drop policy if exists "tiers_select" on public.product_price_tiers';
  execute 'drop policy if exists "tiers_write_admin" on public.product_price_tiers';
  execute $p$create policy "tiers_select" on public.product_price_tiers
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "tiers_write_admin" on public.product_price_tiers
    for all to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())
    with check (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

-- ---------- stock_movements ----------
drop policy if exists "stock_select" on public.stock_movements;
drop policy if exists "stock_insert" on public.stock_movements;
drop policy if exists "stock_update" on public.stock_movements;
drop policy if exists "stock_movements_select" on public.stock_movements;
drop policy if exists "stock_movements_insert" on public.stock_movements;

create policy "stock_select" on public.stock_movements
  for select to authenticated using (organization_id = public.current_org_id());
create policy "stock_insert" on public.stock_movements
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "stock_update" on public.stock_movements
  for update to authenticated using (organization_id = public.current_org_id());

-- ---------- customers ----------
drop policy if exists "customers_select" on public.customers;
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;
drop policy if exists "customers_delete_admin" on public.customers;

create policy "customers_select" on public.customers
  for select to authenticated using (organization_id = public.current_org_id());
create policy "customers_insert" on public.customers
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "customers_update" on public.customers
  for update to authenticated using (organization_id = public.current_org_id());
create policy "customers_delete_admin" on public.customers
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- ---------- invoice_sequences ----------
do $$ begin
  if to_regclass('public.invoice_sequences') is null then return; end if;
  execute 'drop policy if exists "seq_select" on public.invoice_sequences';
  execute $p$create policy "seq_select" on public.invoice_sequences
    for select to authenticated using (organization_id = public.current_org_id())$p$;
end $$;

-- ---------- invoices ----------
drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete_admin" on public.invoices;

create policy "invoices_select" on public.invoices
  for select to authenticated using (organization_id = public.current_org_id());
create policy "invoices_insert" on public.invoices
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "invoices_update" on public.invoices
  for update to authenticated using (organization_id = public.current_org_id());
create policy "invoices_delete_admin" on public.invoices
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- ---------- invoice_items ----------
drop policy if exists "items_select" on public.invoice_items;
drop policy if exists "items_insert" on public.invoice_items;
drop policy if exists "items_update_admin" on public.invoice_items;
drop policy if exists "items_delete_admin" on public.invoice_items;
drop policy if exists "invoice_items_select" on public.invoice_items;
drop policy if exists "invoice_items_insert" on public.invoice_items;

create policy "items_select" on public.invoice_items
  for select to authenticated using (organization_id = public.current_org_id());
create policy "items_insert" on public.invoice_items
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "items_update_admin" on public.invoice_items
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());
create policy "items_delete_admin" on public.invoice_items
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- ---------- business_data_entries ----------
do $$ begin
  if to_regclass('public.business_data_entries') is null then return; end if;
  execute 'drop policy if exists "business_data_entries_select" on public.business_data_entries';
  execute 'drop policy if exists "business_data_entries_insert" on public.business_data_entries';
  execute 'drop policy if exists "business_data_entries_update" on public.business_data_entries';
  execute 'drop policy if exists "business_data_entries_delete" on public.business_data_entries';
  execute $p$create policy "business_data_entries_select" on public.business_data_entries
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "business_data_entries_insert" on public.business_data_entries
    for insert to authenticated with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "business_data_entries_update" on public.business_data_entries
    for update to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "business_data_entries_delete" on public.business_data_entries
    for delete to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

-- ---------- product_costs / other_expenses (legacy) ----------
do $$ begin
  if to_regclass('public.product_costs') is null then return; end if;
  execute 'drop policy if exists "product_costs_select" on public.product_costs';
  execute 'drop policy if exists "product_costs_insert" on public.product_costs';
  execute 'drop policy if exists "product_costs_update" on public.product_costs';
  execute 'drop policy if exists "product_costs_delete" on public.product_costs';
  execute $p$create policy "product_costs_select" on public.product_costs
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "product_costs_insert" on public.product_costs
    for insert to authenticated with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "product_costs_update" on public.product_costs
    for update to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "product_costs_delete" on public.product_costs
    for delete to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

do $$ begin
  if to_regclass('public.other_expenses') is null then return; end if;
  execute 'drop policy if exists "other_expenses_select" on public.other_expenses';
  execute 'drop policy if exists "other_expenses_insert" on public.other_expenses';
  execute 'drop policy if exists "other_expenses_update" on public.other_expenses';
  execute 'drop policy if exists "other_expenses_delete" on public.other_expenses';
  execute $p$create policy "other_expenses_select" on public.other_expenses
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "other_expenses_insert" on public.other_expenses
    for insert to authenticated with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "other_expenses_update" on public.other_expenses
    for update to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "other_expenses_delete" on public.other_expenses
    for delete to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

-- ---------- warehouses ----------
do $$ begin
  if to_regclass('public.warehouses') is null then return; end if;
  execute 'drop policy if exists "warehouses_select" on public.warehouses';
  execute 'drop policy if exists "warehouses_write" on public.warehouses';
  execute $p$create policy "warehouses_select" on public.warehouses
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "warehouses_write" on public.warehouses
    for all to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())
    with check (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

-- ---------- suppliers ----------
do $$ begin
  if to_regclass('public.suppliers') is null then return; end if;
  execute 'drop policy if exists "suppliers_select" on public.suppliers';
  execute 'drop policy if exists "suppliers_write" on public.suppliers';
  execute $p$create policy "suppliers_select" on public.suppliers
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "suppliers_write" on public.suppliers
    for all to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
end $$;

-- ---------- purchases ----------
do $$ begin
  if to_regclass('public.purchases') is null then return; end if;
  execute 'drop policy if exists "purchases_select" on public.purchases';
  execute 'drop policy if exists "purchases_write" on public.purchases';
  execute $p$create policy "purchases_select" on public.purchases
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "purchases_write" on public.purchases
    for all to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
end $$;

do $$ begin
  if to_regclass('public.purchase_items') is null then return; end if;
  execute 'drop policy if exists "purchase_items_select" on public.purchase_items';
  execute 'drop policy if exists "purchase_items_write" on public.purchase_items';
  execute $p$create policy "purchase_items_select" on public.purchase_items
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "purchase_items_write" on public.purchase_items
    for all to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
end $$;

do $$ begin
  if to_regclass('public.purchase_sequences') is null then return; end if;
  execute 'drop policy if exists "purchase_seq_select" on public.purchase_sequences';
  execute $p$create policy "purchase_seq_select" on public.purchase_sequences
    for select to authenticated using (organization_id = public.current_org_id())$p$;
end $$;

-- ---------- credit notes ----------
do $$ begin
  if to_regclass('public.credit_notes') is null then return; end if;
  execute 'drop policy if exists "credit_notes_select" on public.credit_notes';
  execute 'drop policy if exists "credit_notes_write" on public.credit_notes';
  execute $p$create policy "credit_notes_select" on public.credit_notes
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "credit_notes_write" on public.credit_notes
    for all to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
end $$;

do $$ begin
  if to_regclass('public.credit_note_items') is null then return; end if;
  execute 'drop policy if exists "credit_note_items_select" on public.credit_note_items';
  execute 'drop policy if exists "credit_note_items_write" on public.credit_note_items';
  execute $p$create policy "credit_note_items_select" on public.credit_note_items
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "credit_note_items_write" on public.credit_note_items
    for all to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
end $$;

do $$ begin
  if to_regclass('public.credit_note_sequences') is null then return; end if;
  execute 'drop policy if exists "credit_seq_select" on public.credit_note_sequences';
  execute $p$create policy "credit_seq_select" on public.credit_note_sequences
    for select to authenticated using (organization_id = public.current_org_id())$p$;
end $$;

-- ---------- company_settings (legacy) ----------
do $$ begin
  if to_regclass('public.company_settings') is null then return; end if;
  execute 'drop policy if exists "company_select" on public.company_settings';
  execute 'drop policy if exists "company_insert_admin" on public.company_settings';
  execute 'drop policy if exists "company_update_admin" on public.company_settings';
  execute $p$create policy "company_select" on public.company_settings
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "company_insert_admin" on public.company_settings
    for insert to authenticated
    with check (organization_id = public.current_org_id() and public.is_admin())$p$;
  execute $p$create policy "company_update_admin" on public.company_settings
    for update to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

select pg_notify('pgrst', 'reload schema');


-- ========== SECTION 019 — run after 018 succeeds ==========

-- ============================================================
-- Phase 1 / Step 4: auth trigger + org-scoped RPCs / sequences
-- Requires 017 + 018
-- ============================================================

-- Ensure helpers from earlier migrations exist
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid()
$$;

create or replace function public.get_financial_year(d date default current_date)
returns text
language plpgsql
immutable
as $$
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
$$;

-- Signup / invite own profile creation (with organization_id)
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  -- Intentionally no insert into public.users â€” signup API and invite set org.
  return new;
end;
$$ language plpgsql security definer;

-- Stamp price_history.organization_id from product
create or replace function public.log_price_change()
returns trigger as $$
begin
  if old.base_price is distinct from new.base_price then
    insert into public.price_history (product_id, old_price, new_price, changed_by, organization_id)
    values (new.id, old.base_price, new.base_price, auth.uid(), new.organization_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ---------- Org-scoped invoice numbers ----------
create or replace function public.next_invoice_number(prefix text default 'AURA')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  fy text := public.get_financial_year(current_date);
  next_num integer;
  v_org uuid := public.current_org_id();
begin
  if v_org is null then
    raise exception 'No organization for current user';
  end if;

  insert into public.invoice_sequences (organization_id, financial_year, last_number)
  values (v_org, fy, 1)
  on conflict (organization_id, financial_year)
  do update set last_number = public.invoice_sequences.last_number + 1
  returning last_number into next_num;

  return prefix || '/' || fy || '/' || lpad(next_num::text, 4, '0');
end;
$$;

create or replace function public.next_purchase_number(p_prefix text default 'PO')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text;
  v_n integer;
  v_org uuid := public.current_org_id();
begin
  if v_org is null then
    raise exception 'No organization for current user';
  end if;

  v_fy := case
    when extract(month from current_date) >= 4
      then to_char(current_date, 'YY') || '-' || to_char(current_date + interval '1 year', 'YY')
    else to_char(current_date - interval '1 year', 'YY') || '-' || to_char(current_date, 'YY')
  end;

  insert into public.purchase_sequences (organization_id, financial_year, last_number)
  values (v_org, v_fy, 1)
  on conflict (organization_id, financial_year) do update
    set last_number = public.purchase_sequences.last_number + 1
  returning last_number into v_n;

  return p_prefix || '/' || v_fy || '/' || lpad(v_n::text, 4, '0');
end;
$$;

create or replace function public.next_credit_note_number(p_prefix text default 'CN')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text;
  v_n integer;
  v_org uuid := public.current_org_id();
begin
  if v_org is null then
    raise exception 'No organization for current user';
  end if;

  v_fy := case
    when extract(month from current_date) >= 4
      then to_char(current_date, 'YY') || '-' || to_char(current_date + interval '1 year', 'YY')
    else to_char(current_date - interval '1 year', 'YY') || '-' || to_char(current_date, 'YY')
  end;

  insert into public.credit_note_sequences (organization_id, financial_year, last_number)
  values (v_org, v_fy, 1)
  on conflict (organization_id, financial_year) do update
    set last_number = public.credit_note_sequences.last_number + 1
  returning last_number into v_n;

  return p_prefix || '/' || v_fy || '/' || lpad(v_n::text, 4, '0');
end;
$$;

-- ---------- create_invoice_atomic (org-scoped) ----------
create or replace function public.create_invoice_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org uuid := public.current_org_id();
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

    select p.name into v_product_name
    from public.products p
    where p.id = v_product_id and p.organization_id = v_org;
    if v_product_name is null then
      raise exception 'Product not found: %', v_product_id;
    end if;

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
    insert into public.invoice_items (
      invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
      taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
      organization_id
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
      (v_item->>'line_total')::numeric,
      v_org
    );

    insert into public.stock_movements (
      product_id, movement_type, quantity, reference, reason, created_by,
      warehouse_id, organization_id
    ) values (
      (v_item->>'product_id')::uuid,
      'out',
      -abs((v_item->>'quantity')::integer),
      v_invoice_number,
      'Invoice ' || v_invoice_number,
      coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id),
      v_warehouse_id,
      v_org
    );
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

-- ---------- update_invoice_atomic (org-scoped) ----------
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

  if not exists (
    select 1 from public.customers
    where id = v_customer_id and organization_id = v_org
  ) then
    raise exception 'Customer not found';
  end if;

  v_old_number := v_invoice.invoice_number;

  delete from public.stock_movements
  where reference = v_old_number
    and organization_id = v_org
    and (
      (movement_type = 'out' and reason like 'Invoice %')
      or (movement_type = 'in' and reason like 'Void restore%')
    );

  delete from public.invoice_items
  where invoice_id = p_invoice_id and organization_id = v_org;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select p.name into v_product_name
    from public.products p
    where p.id = v_product_id and p.organization_id = v_org;
    if v_product_name is null then
      raise exception 'Product not found: %', v_product_id;
    end if;

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
    insert into public.invoice_items (
      invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
      taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
      organization_id
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
      (v_item->>'line_total')::numeric,
      v_org
    );

    insert into public.stock_movements (
      product_id, movement_type, quantity, reference, reason, created_by,
      warehouse_id, organization_id
    ) values (
      (v_item->>'product_id')::uuid,
      'out',
      -abs((v_item->>'quantity')::integer),
      v_invoice.invoice_number,
      'Invoice ' || v_invoice.invoice_number,
      coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id),
      v_warehouse_id,
      v_org
    );
  end loop;

  return to_jsonb(v_invoice);
end;
$$;

grant execute on function public.next_invoice_number(text) to authenticated;
grant execute on function public.next_purchase_number(text) to authenticated;
grant execute on function public.next_credit_note_number(text) to authenticated;
grant execute on function public.create_invoice_atomic(jsonb) to authenticated;
grant execute on function public.update_invoice_atomic(uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');

