-- ============================================================
-- Fix: allow each user to read their own public.users row
-- ============================================================
-- Org-scoped select alone fails when organization_id is null, and
-- also fails for "unlinked" debugging. Own-row access is required
-- for AuthProvider profile lookup.
-- Safe to run multiple times.
-- ============================================================

drop policy if exists "users_select" on public.users;

create policy "users_select" on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or organization_id = public.current_org_id()
  );
