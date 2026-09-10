-- ============================================================
-- MINIMAL: create organizations table ONLY (run this first if
-- the table is missing). Then re-run full 016 if you want RLS + seed.
-- ============================================================

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

-- Confirm it worked:
select id, name, slug, plan from public.organizations;
