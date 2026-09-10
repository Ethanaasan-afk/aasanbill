  -- Unified internal bookkeeping ledger (replaces product_costs / other_expenses UI).
  -- Old tables can remain unused; this is the source of truth going forward.

  create table if not exists public.business_data_entries (
    id uuid primary key default gen_random_uuid(),
    company_person_name text not null,
    category text not null check (
      category in (
        'product_purchase',
        'rent',
        'salary',
        'utilities',
        'transport',
        'packaging',
        'marketing',
        'maintenance',
        'misc'
      )
    ),
    item_name text not null,
    expense_name text not null,
    payment_method text not null check (
      payment_method in ('cash', 'bank_transfer', 'upi', 'cheque', 'card')
    ),
    amount numeric(10,2) not null,
    note text,
    entry_date date not null default current_date,
    created_by uuid references public.users(id),
    created_at timestamptz not null default now()
  );

  create index if not exists business_data_entries_date_idx
    on public.business_data_entries (entry_date desc);
  create index if not exists business_data_entries_category_idx
    on public.business_data_entries (category);

  alter table public.business_data_entries enable row level security;

  drop policy if exists "business_data_entries_select" on public.business_data_entries;
  drop policy if exists "business_data_entries_insert" on public.business_data_entries;
  drop policy if exists "business_data_entries_update" on public.business_data_entries;
  drop policy if exists "business_data_entries_delete" on public.business_data_entries;

  create policy "business_data_entries_select" on public.business_data_entries
    for select to authenticated using (auth.uid() is not null);
  create policy "business_data_entries_insert" on public.business_data_entries
    for insert to authenticated with check (auth.uid() is not null);
  create policy "business_data_entries_update" on public.business_data_entries
    for update to authenticated using (auth.uid() is not null);
  create policy "business_data_entries_delete" on public.business_data_entries
    for delete to authenticated using (public.is_admin());

  select pg_notify('pgrst', 'reload schema');
