-- ============================================================
-- Fix: ensure product_stock view exists + stock RLS is readable
-- Run in Supabase SQL Editor if stock stays at 0 after Stock in
-- ============================================================

-- Live stock = sum of signed movement quantities
create or replace view public.product_stock
with (security_invoker = true) as
select
  p.id as product_id,
  coalesce(sum(sm.quantity), 0)::integer as current_stock
from public.products p
left join public.stock_movements sm on sm.product_id = p.id
group by p.id;

grant select on public.product_stock to authenticated;
grant select on public.product_stock to anon;

-- Loosen stock movement policies (same pattern as users fix)
-- so authenticated team members can insert/read movements
drop policy if exists "stock_select" on public.stock_movements;
drop policy if exists "stock_insert" on public.stock_movements;
drop policy if exists "stock_movements_select" on public.stock_movements;
drop policy if exists "stock_movements_insert" on public.stock_movements;

create policy "stock_select" on public.stock_movements
  for select to authenticated
  using (auth.uid() is not null);

create policy "stock_insert" on public.stock_movements
  for insert to authenticated
  with check (auth.uid() is not null);

-- Reload PostgREST schema cache so the view is visible immediately
select pg_notify('pgrst', 'reload schema');
