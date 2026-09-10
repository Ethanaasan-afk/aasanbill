-- Internal bookkeeping only — never used by invoice/billing flow.
-- Run in Supabase SQL Editor if not applied via CLI.

create table if not exists public.product_costs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  cost_price numeric(10,2) not null,
  supplier text,
  purchase_date date not null default current_date,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists product_costs_product_id_idx on public.product_costs (product_id);
create index if not exists product_costs_purchase_date_idx on public.product_costs (purchase_date desc);

alter table public.product_costs enable row level security;

drop policy if exists "product_costs_select" on public.product_costs;
drop policy if exists "product_costs_insert" on public.product_costs;
drop policy if exists "product_costs_update" on public.product_costs;
drop policy if exists "product_costs_delete" on public.product_costs;

create policy "product_costs_select" on public.product_costs
  for select to authenticated using (auth.uid() is not null);
create policy "product_costs_insert" on public.product_costs
  for insert to authenticated with check (auth.uid() is not null);
create policy "product_costs_update" on public.product_costs
  for update to authenticated using (auth.uid() is not null);
create policy "product_costs_delete" on public.product_costs
  for delete to authenticated using (public.is_admin());

create table if not exists public.other_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (
    category in (
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
  description text not null,
  amount numeric(10,2) not null,
  paid_to text,
  payment_mode text check (
    payment_mode in ('cash', 'bank_transfer', 'upi', 'cheque', 'card')
  ),
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists other_expenses_date_idx on public.other_expenses (expense_date desc);
create index if not exists other_expenses_category_idx on public.other_expenses (category);

alter table public.other_expenses enable row level security;

drop policy if exists "other_expenses_select" on public.other_expenses;
drop policy if exists "other_expenses_insert" on public.other_expenses;
drop policy if exists "other_expenses_update" on public.other_expenses;
drop policy if exists "other_expenses_delete" on public.other_expenses;

create policy "other_expenses_select" on public.other_expenses
  for select to authenticated using (auth.uid() is not null);
create policy "other_expenses_insert" on public.other_expenses
  for insert to authenticated with check (auth.uid() is not null);
create policy "other_expenses_update" on public.other_expenses
  for update to authenticated using (auth.uid() is not null);
create policy "other_expenses_delete" on public.other_expenses
  for delete to authenticated using (public.is_admin());
