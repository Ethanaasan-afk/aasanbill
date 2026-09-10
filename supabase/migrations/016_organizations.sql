-- ============================================================
-- Phase 1 / Step 1: organizations (multi-tenant foundation)
-- Safe to re-run. Creates the table FIRST so a later RLS/helper
-- error cannot leave you without organizations.
-- ============================================================

-- 1) TABLE FIRST (no dependency on is_app_user / is_admin)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  gstin text,
  address text,
  state text not null default 'Gujarat',
  bank_details text,
  logo_url text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'business')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now(),

  brand_name text not null default '',
  city text not null default '',
  pincode text not null default '',
  phone text not null default '',
  email text not null default '',
  bank_name text not null default '',
  bank_account text not null default '',
  bank_ifsc text not null default '',
  bank_branch text not null default '',
  invoice_prefix text not null default 'AURA',
  upi_id text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists organizations_slug_idx on public.organizations (slug);

-- 2) RLS helpers (normally from 001_schema.sql)
-- Requires public.users to already exist.
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

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_app_user() to authenticated;

-- 3) RLS policies
alter table public.organizations enable row level security;

drop policy if exists "organizations_select" on public.organizations;
create policy "organizations_select" on public.organizations
  for select to authenticated
  using (public.is_app_user());

drop policy if exists "organizations_insert_admin" on public.organizations;
create policy "organizations_insert_admin" on public.organizations
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (public.is_admin());

drop policy if exists "organizations_update" on public.organizations;
-- (018 may replace this with org-scoped update; keep admin insert/select for now)

-- 4) Seed AURA Clean from company_settings (if present)
do $$
begin
  if to_regclass('public.company_settings') is null then
    return;
  end if;

  if exists (select 1 from public.organizations where slug = 'aura-clean') then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_settings'
      and column_name = 'upi_id'
  ) then
    insert into public.organizations (
      name, slug, gstin, address, state, bank_details,
      brand_name, city, pincode, phone, email,
      bank_name, bank_account, bank_ifsc, bank_branch,
      invoice_prefix, upi_id, plan, trial_ends_at
    )
    select
      coalesce(nullif(cs.company_name, ''), 'Laiba Lubricants Pvt. Ltd.'),
      'aura-clean',
      nullif(cs.gstin, ''),
      nullif(
        trim(concat_ws(', ', nullif(cs.address, ''), nullif(cs.city, ''), nullif(cs.pincode, ''))),
        ''
      ),
      coalesce(nullif(cs.state, ''), 'Gujarat'),
      nullif(
        trim(concat_ws(
          ' · ',
          nullif(cs.bank_name, ''),
          case when cs.bank_account <> '' then 'A/c ' || cs.bank_account else null end,
          case when cs.bank_ifsc <> '' then 'IFSC ' || cs.bank_ifsc else null end,
          nullif(cs.bank_branch, '')
        )),
        ''
      ),
      coalesce(nullif(cs.brand_name, ''), 'AURA Clean'),
      coalesce(cs.city, ''),
      coalesce(cs.pincode, ''),
      coalesce(cs.phone, ''),
      coalesce(nullif(cs.email, ''), 'admin@auraclean.local'),
      coalesce(cs.bank_name, ''),
      coalesce(cs.bank_account, ''),
      coalesce(cs.bank_ifsc, ''),
      coalesce(cs.bank_branch, ''),
      coalesce(nullif(cs.invoice_prefix, ''), 'AURA'),
      coalesce(cs.upi_id, ''),
      'business',
      now() + interval '365 days'
    from public.company_settings cs
    limit 1;
  else
    insert into public.organizations (
      name, slug, gstin, address, state, bank_details,
      brand_name, city, pincode, phone, email,
      bank_name, bank_account, bank_ifsc, bank_branch,
      invoice_prefix, upi_id, plan, trial_ends_at
    )
    select
      coalesce(nullif(cs.company_name, ''), 'Laiba Lubricants Pvt. Ltd.'),
      'aura-clean',
      nullif(cs.gstin, ''),
      nullif(
        trim(concat_ws(', ', nullif(cs.address, ''), nullif(cs.city, ''), nullif(cs.pincode, ''))),
        ''
      ),
      coalesce(nullif(cs.state, ''), 'Gujarat'),
      nullif(
        trim(concat_ws(
          ' · ',
          nullif(cs.bank_name, ''),
          case when cs.bank_account <> '' then 'A/c ' || cs.bank_account else null end,
          case when cs.bank_ifsc <> '' then 'IFSC ' || cs.bank_ifsc else null end,
          nullif(cs.bank_branch, '')
        )),
        ''
      ),
      coalesce(nullif(cs.brand_name, ''), 'AURA Clean'),
      coalesce(cs.city, ''),
      coalesce(cs.pincode, ''),
      coalesce(cs.phone, ''),
      coalesce(nullif(cs.email, ''), 'admin@auraclean.local'),
      coalesce(cs.bank_name, ''),
      coalesce(cs.bank_account, ''),
      coalesce(cs.bank_ifsc, ''),
      coalesce(cs.bank_branch, ''),
      coalesce(nullif(cs.invoice_prefix, ''), 'AURA'),
      '',
      'business',
      now() + interval '365 days'
    from public.company_settings cs
    limit 1;
  end if;
end $$;

-- 5) Fallback seed if company_settings empty / missing
insert into public.organizations (
  name, slug, brand_name, state, email, invoice_prefix, plan, trial_ends_at
)
select
  'Laiba Lubricants Pvt. Ltd.',
  'aura-clean',
  'AURA Clean',
  'Gujarat',
  'admin@auraclean.local',
  'AURA',
  'business',
  now() + interval '365 days'
where not exists (select 1 from public.organizations where slug = 'aura-clean');

select pg_notify('pgrst', 'reload schema');

-- Verify:
-- select id, name, slug, plan from public.organizations;
