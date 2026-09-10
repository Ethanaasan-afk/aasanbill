-- Short branded PDF links: /i/{short_code} → fresh signed Storage URL
alter table public.invoices
  add column if not exists short_code text;

create unique index if not exists invoices_short_code_uidx
  on public.invoices (short_code)
  where short_code is not null;

notify pgrst, 'reload schema';
