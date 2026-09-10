-- ============================================================
-- Phase 2: Razorpay subscription tracking
-- Requires Phase 1 (organizations + current_org_id).
-- ============================================================

alter table public.organizations
  add column if not exists razorpay_customer_id text;

alter table public.organizations
  add column if not exists razorpay_subscription_id text;

alter table public.organizations
  add column if not exists current_period_end timestamptz;

alter table public.organizations
  add column if not exists cancel_at_period_end boolean not null default false;

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  event_type text not null,
  razorpay_subscription_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_org_idx
  on public.billing_events (organization_id, created_at desc);

alter table public.billing_events enable row level security;

drop policy if exists "billing_events_select" on public.billing_events;
create policy "billing_events_select" on public.billing_events
  for select to authenticated
  using (organization_id = public.current_org_id());

-- Inserts only via service role (webhook) — no client insert policy

select pg_notify('pgrst', 'reload schema');
