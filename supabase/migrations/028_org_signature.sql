-- ============================================================
-- Org signature image for invoices
-- Adds signature_url + private-ish signatures storage bucket
-- (public read so invoice PDFs/customers can load the image URL;
--  write scoped to the org folder via RLS).
-- ============================================================

-- 1) Column on organizations (app source of truth)
alter table public.organizations
  add column if not exists signature_url text;

-- 2) Legacy company_settings if still present
do $$ begin
  if to_regclass('public.company_settings') is not null then
    execute 'alter table public.company_settings add column if not exists signature_url text';
  end if;
end $$;

-- 3) Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signatures',
  'signatures',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/jpg']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4) Storage policies — path: {organization_id}/signature.{ext}
drop policy if exists "signatures_select_own_org" on storage.objects;
drop policy if exists "signatures_insert_own_org" on storage.objects;
drop policy if exists "signatures_update_own_org" on storage.objects;
drop policy if exists "signatures_delete_own_org" on storage.objects;
drop policy if exists "signatures_select_public" on storage.objects;

-- Public bucket: allow read for anyone (URL used on printed invoices)
create policy "signatures_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'signatures');

create policy "signatures_insert_own_org"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_admin()
  );

create policy "signatures_update_own_org"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_admin()
  )
  with check (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_admin()
  );

create policy "signatures_delete_own_org"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.is_admin()
  );

select pg_notify('pgrst', 'reload schema');
