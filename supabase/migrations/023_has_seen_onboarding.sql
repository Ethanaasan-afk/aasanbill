-- Allow each user to mark their own onboarding as done
alter table public.users
  add column if not exists has_seen_onboarding boolean not null default false;

drop policy if exists "users_update_own_onboarding" on public.users;
create policy "users_update_own_onboarding"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

notify pgrst, 'reload schema';
