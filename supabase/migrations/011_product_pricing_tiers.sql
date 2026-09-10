-- Customer-facing pricing tiers (excl. GST). Manufacturing costs stay in business_data.
-- Run in Supabase SQL Editor if not applied via CLI.

alter table public.products
  add column if not exists distributor_price numeric(10, 2),
  add column if not exists wholesaler_price numeric(10, 2),
  add column if not exists retailer_price numeric(10, 2),
  add column if not exists mrp numeric(10, 2);

select pg_notify('pgrst', 'reload schema');
