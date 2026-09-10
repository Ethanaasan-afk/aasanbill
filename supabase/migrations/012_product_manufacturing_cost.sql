-- Internal quick-reference manufacturing cost on products (not used for invoices/GST).
-- Detailed cost history remains in business_data_entries / Product Costs.

alter table public.products
  add column if not exists manufacturing_cost numeric(10, 2);

select pg_notify('pgrst', 'reload schema');
