-- ============================================================
-- Stock movement edit audit columns + update RLS
-- Run in: Supabase → SQL Editor → New query → Run
-- ============================================================

alter table public.stock_movements
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.users(id);

-- Allow update for authenticated users (app enforces admin-or-creator)
drop policy if exists "stock_update" on public.stock_movements;
create policy "stock_update" on public.stock_movements
  for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

select pg_notify('pgrst', 'reload schema');
