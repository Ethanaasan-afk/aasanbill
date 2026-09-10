-- Customer Udhaar: payments table + invoice amount_paid + partially_paid status.
-- Safe to re-run. Paste in Supabase SQL editor if needed.

-- 1) invoices.amount_paid
alter table public.invoices
  add column if not exists amount_paid numeric(14, 2) not null default 0;

comment on column public.invoices.amount_paid is
  'Sum of payments applied to this invoice. Status derived vs grand_total.';

-- 2) Allow partially_paid status
do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'invoices'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';
  if c_name is not null then
    execute format('alter table public.invoices drop constraint %I', c_name);
  end if;
end $$;

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('issued', 'paid', 'partially_paid', 'cancelled'));

-- Backfill: paid invoices should show fully paid
update public.invoices
set amount_paid = grand_total
where status = 'paid' and coalesce(amount_paid, 0) = 0;

-- 3) payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_date date not null default (current_date),
  payment_mode text not null
    check (payment_mode in ('cash', 'bank_transfer', 'upi', 'cheque', 'card')),
  notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_org_idx on public.payments (organization_id);
create index if not exists payments_customer_idx on public.payments (customer_id);
create index if not exists payments_invoice_idx on public.payments (invoice_id);
create index if not exists payments_date_idx on public.payments (payment_date desc);

alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
drop policy if exists "payments_update" on public.payments;
drop policy if exists "payments_delete" on public.payments;

create policy "payments_select" on public.payments
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy "payments_insert" on public.payments
  for insert to authenticated
  with check (organization_id = public.current_org_id());

create policy "payments_update" on public.payments
  for update to authenticated
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

create policy "payments_delete" on public.payments
  for delete to authenticated
  using (organization_id = public.current_org_id() and public.is_admin());

-- 4) Atomic record-payment helper (updates invoice amount_paid + status when linked)
create or replace function public.record_payment(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org uuid := public.current_org_id();
  v_customer_id uuid;
  v_invoice_id uuid;
  v_amount numeric(14, 2);
  v_payment_date date;
  v_payment_mode text;
  v_notes text;
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_new_paid numeric(14, 2);
  v_new_status text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_org is null then
    raise exception 'No organization for current user';
  end if;

  v_customer_id := (payload->>'customer_id')::uuid;
  v_invoice_id := nullif(payload->>'invoice_id', '')::uuid;
  v_amount := (payload->>'amount')::numeric;
  v_payment_date := coalesce((payload->>'payment_date')::date, current_date);
  v_payment_mode := coalesce(nullif(payload->>'payment_mode', ''), 'cash');
  v_notes := nullif(payload->>'notes', '');

  if v_customer_id is null then
    raise exception 'customer_id is required';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be > 0';
  end if;
  if v_payment_mode not in ('cash', 'bank_transfer', 'upi', 'cheque', 'card') then
    raise exception 'Invalid payment_mode';
  end if;

  if not exists (
    select 1 from public.customers
    where id = v_customer_id and organization_id = v_org
  ) then
    raise exception 'Customer not found';
  end if;

  if v_invoice_id is not null then
    select * into v_invoice
    from public.invoices
    where id = v_invoice_id and organization_id = v_org
    for update;
    if not found then
      raise exception 'Invoice not found';
    end if;
    if v_invoice.customer_id <> v_customer_id then
      raise exception 'Invoice does not belong to this customer';
    end if;
    if v_invoice.status = 'cancelled' then
      raise exception 'Cannot record payment on a cancelled invoice';
    end if;
  end if;

  insert into public.payments (
    organization_id, customer_id, invoice_id, amount,
    payment_date, payment_mode, notes, created_by
  ) values (
    v_org, v_customer_id, v_invoice_id, v_amount,
    v_payment_date, v_payment_mode, v_notes,
    coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id)
  )
  returning * into v_payment;

  if v_invoice_id is not null then
    v_new_paid := round(coalesce(v_invoice.amount_paid, 0) + v_amount, 2);
    if v_new_paid >= v_invoice.grand_total then
      v_new_paid := v_invoice.grand_total;
      v_new_status := 'paid';
    elsif v_new_paid > 0 then
      v_new_status := 'partially_paid';
    else
      v_new_status := 'issued';
    end if;

    update public.invoices
    set amount_paid = v_new_paid,
        status = v_new_status
    where id = v_invoice_id;
  end if;

  return to_jsonb(v_payment);
end;
$$;

grant execute on function public.record_payment(jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
