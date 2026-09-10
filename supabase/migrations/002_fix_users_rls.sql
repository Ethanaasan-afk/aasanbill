-- ============================================================
-- Fix: users RLS blocked the logged-in profile lookup
-- Run in Supabase SQL Editor once
-- ============================================================
-- Cause: policy used is_app_user() which SELECTed public.users again
-- under RLS, so the app's "select * from users where id = auth.uid()"
-- returned zero rows even though the row exists in Table Editor
-- (Table Editor uses the service role and bypasses RLS).
-- ============================================================

-- Fix typo that broke re-runs of this file: "security definerx`"
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

-- Allow any authenticated user to read the team list / own profile
-- (no circular dependency on is_app_user for this table)
drop policy if exists "users_select" on public.users;
drop policy if exists "users_admin_write" on public.users;
drop policy if exists "users_insert_admin" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_delete_admin" on public.users;

create policy "users_select" on public.users
  for select to authenticated
  using (auth.uid() is not null);

create policy "users_insert_admin" on public.users
  for insert to authenticated
  with check (public.is_admin());

create policy "users_update_admin" on public.users
  for update to authenticated
  using (public.is_admin());

create policy "users_delete_admin" on public.users
  for delete to authenticated
  using (public.is_admin());

-- Ensure this auth user is linked as admin (safe if already correct)
insert into public.users (id, full_name, role, organization_id)
values (
  'a231e633-9580-4c90-b1e9-a243c4b7fa6a',
  'Taiyab Khan',
  'admin',
  (select id from public.organizations order by created_at asc limit 1)
)
on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role;