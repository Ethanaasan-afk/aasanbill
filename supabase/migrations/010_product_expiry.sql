-- Product manufacturing / expiry dates for shelf-life tracking.
-- Run in Supabase SQL Editor if not applied via CLI.

alter table public.products
  add column if not exists mfg_date date,
  add column if not exists exp_date date;

select pg_notify('pgrst', 'reload schema');
