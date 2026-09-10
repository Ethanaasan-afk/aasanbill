-- ============================================================
-- PASTE into Supabase SQL Editor (once)
-- Fix: allow each user to read their own public.users row
-- ============================================================

drop policy if exists "users_select" on public.users;

create policy "users_select" on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or organization_id = public.current_org_id()
  );
