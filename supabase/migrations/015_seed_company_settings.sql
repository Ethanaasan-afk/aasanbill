-- Seed company settings if the table is empty (fixes Settings page load)
insert into public.company_settings (
  company_name, brand_name, gstin, address, city, state, pincode, phone, email,
  bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix
)
select
  'Laiba Lubricants Pvt. Ltd.',
  'AURA Clean',
  '',
  '',
  '',
  'Gujarat',
  '',
  '',
  'admin@auraclean.local',
  '',
  '',
  '',
  '',
  'AURA'
where not exists (select 1 from public.company_settings limit 1);

-- Optional: UPI column for invoice QR
alter table public.company_settings
  add column if not exists upi_id text not null default '';

select pg_notify('pgrst', 'reload schema');
