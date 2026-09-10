-- ============================================================
-- Hardening: ensure no pre-org permissive RLS remains on tenant tables.
-- Early migrations 008/009 used `auth.uid() is not null` (any logged-in user).
-- 018 replaces those; this re-asserts org scope idempotently.
-- Safe to run multiple times.
-- ============================================================

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid()
$$;

-- business_data_entries (primary Business Data UI)
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
    for update to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "business_data_entries_delete" on public.business_data_entries
    for delete to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

-- Legacy tables (if present)
do $$ begin
  if to_regclass('public.product_costs') is null then return; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_costs' and column_name = 'organization_id'
  ) then
    raise notice 'product_costs missing organization_id — skip RLS harden';
    return;
  end if;
  execute 'drop policy if exists "product_costs_select" on public.product_costs';
  execute 'drop policy if exists "product_costs_insert" on public.product_costs';
  execute 'drop policy if exists "product_costs_update" on public.product_costs';
  execute 'drop policy if exists "product_costs_delete" on public.product_costs';
  execute $p$create policy "product_costs_select" on public.product_costs
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "product_costs_insert" on public.product_costs
    for insert to authenticated with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "product_costs_update" on public.product_costs
    for update to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "product_costs_delete" on public.product_costs
    for delete to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

do $$ begin
  if to_regclass('public.other_expenses') is null then return; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'other_expenses' and column_name = 'organization_id'
  ) then
    raise notice 'other_expenses missing organization_id — skip RLS harden';
    return;
  end if;
  execute 'drop policy if exists "other_expenses_select" on public.other_expenses';
  execute 'drop policy if exists "other_expenses_insert" on public.other_expenses';
  execute 'drop policy if exists "other_expenses_update" on public.other_expenses';
  execute 'drop policy if exists "other_expenses_delete" on public.other_expenses';
  execute $p$create policy "other_expenses_select" on public.other_expenses
    for select to authenticated using (organization_id = public.current_org_id())$p$;
  execute $p$create policy "other_expenses_insert" on public.other_expenses
    for insert to authenticated with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "other_expenses_update" on public.other_expenses
    for update to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id())$p$;
  execute $p$create policy "other_expenses_delete" on public.other_expenses
    for delete to authenticated
    using (organization_id = public.current_org_id() and public.is_admin())$p$;
end $$;

-- Core tenant tables (re-assert; matches 018)
drop policy if exists "products_select" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete_admin" on public.products;
create policy "products_select" on public.products
  for select to authenticated using (organization_id = public.current_org_id());
create policy "products_insert" on public.products
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "products_update" on public.products
  for update to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy "products_delete_admin" on public.products
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "customers_select" on public.customers;
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;
drop policy if exists "customers_delete_admin" on public.customers;
create policy "customers_select" on public.customers
  for select to authenticated using (organization_id = public.current_org_id());
create policy "customers_insert" on public.customers
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "customers_update" on public.customers
  for update to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy "customers_delete_admin" on public.customers
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete_admin" on public.invoices;
create policy "invoices_select" on public.invoices
  for select to authenticated using (organization_id = public.current_org_id());
create policy "invoices_insert" on public.invoices
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "invoices_update" on public.invoices
  for update to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy "invoices_delete_admin" on public.invoices
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists "items_select" on public.invoice_items;
drop policy if exists "items_insert" on public.invoice_items;
drop policy if exists "items_update_admin" on public.invoice_items;
drop policy if exists "items_delete_admin" on public.invoice_items;
create policy "items_select" on public.invoice_items
  for select to authenticated using (organization_id = public.current_org_id());
create policy "items_insert" on public.invoice_items
  for insert to authenticated with check (organization_id = public.current_org_id());
create policy "items_update_admin" on public.invoice_items
  for update to authenticated
  using (organization_id = public.current_org_id() and public.is_admin())
  with check (organization_id = public.current_org_id() and public.is_admin());
create policy "items_delete_admin" on public.invoice_items
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

select pg_notify('pgrst', 'reload schema');
