-- ============================================================
-- PASTE into Supabase SQL Editor (once)
-- Global live market metal rates (reference only - not used for invoicing)
-- ============================================================

create table if not exists public.live_metal_rates (
  id uuid primary key default gen_random_uuid(),
  metal_type text not null,
  karat_or_purity text not null,
  rate_per_gram_inr numeric(14,2) not null check (rate_per_gram_inr >= 0),
  fetched_at timestamptz not null default now()
);

create index if not exists live_metal_rates_lookup_idx
  on public.live_metal_rates (metal_type, karat_or_purity, fetched_at desc);

create index if not exists live_metal_rates_fetched_at_idx
  on public.live_metal_rates (fetched_at desc);

alter table public.live_metal_rates enable row level security;

drop policy if exists "live_metal_rates_select" on public.live_metal_rates;
create policy "live_metal_rates_select" on public.live_metal_rates
  for select to authenticated
  using (true);

-- Writes only via service role (API refresh route)

comment on table public.live_metal_rates is
  'Cached Metals.Dev spot rates in INR/g. Reference only - shop metal_rates drive invoices.';
