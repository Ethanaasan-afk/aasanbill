  -- ============================================================
  -- PASTE into Supabase SQL Editor (once)
  -- Hotel rooms + bookings (date-based availability)
  -- Does not change non-hotel org behaviour.
  -- ============================================================

  -- 1) Room types (catalog for hotel orgs — not stock products)
  create table if not exists public.room_types (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    name text not null,
    description text,
    sac_code text,
    base_price numeric(14,2) not null default 0 check (base_price >= 0),
    gst_rate numeric(5,2) not null default 12 check (gst_rate >= 0),
    max_occupancy integer not null default 2 check (max_occupancy >= 1),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
  );

  create index if not exists room_types_org_idx on public.room_types (organization_id);

  alter table public.room_types enable row level security;

  drop policy if exists "room_types_select" on public.room_types;
  drop policy if exists "room_types_insert" on public.room_types;
  drop policy if exists "room_types_update" on public.room_types;
  drop policy if exists "room_types_delete" on public.room_types;

  create policy "room_types_select" on public.room_types
    for select to authenticated
    using (organization_id = public.current_org_id());
  create policy "room_types_insert" on public.room_types
    for insert to authenticated
    with check (organization_id = public.current_org_id());
  create policy "room_types_update" on public.room_types
    for update to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());
  create policy "room_types_delete" on public.room_types
    for delete to authenticated
    using (organization_id = public.current_org_id());

  -- 2) Physical rooms
  create table if not exists public.rooms (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    room_type_id uuid not null references public.room_types (id) on delete restrict,
    room_number text not null,
    status text not null default 'available'
      check (status in ('available', 'maintenance', 'out_of_service')),
    created_at timestamptz not null default now(),
    unique (organization_id, room_number)
  );

  create index if not exists rooms_org_idx on public.rooms (organization_id);
  create index if not exists rooms_type_idx on public.rooms (room_type_id);

  alter table public.rooms enable row level security;

  drop policy if exists "rooms_select" on public.rooms;
  drop policy if exists "rooms_insert" on public.rooms;
  drop policy if exists "rooms_update" on public.rooms;
  drop policy if exists "rooms_delete" on public.rooms;

  create policy "rooms_select" on public.rooms
    for select to authenticated
    using (organization_id = public.current_org_id());
  create policy "rooms_insert" on public.rooms
    for insert to authenticated
    with check (organization_id = public.current_org_id());
  create policy "rooms_update" on public.rooms
    for update to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());
  create policy "rooms_delete" on public.rooms
    for delete to authenticated
    using (organization_id = public.current_org_id());

  -- 3) Bookings (date ranges — source of availability)
  create table if not exists public.room_bookings (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    room_id uuid not null references public.rooms (id) on delete restrict,
    customer_id uuid not null references public.customers (id) on delete restrict,
    check_in_date date not null,
    check_out_date date not null,
    status text not null default 'booked'
      check (status in ('booked', 'checked_in', 'checked_out', 'cancelled')),
    guest_id_proof text,
    notes text,
    invoice_id uuid references public.invoices (id) on delete set null,
    created_at timestamptz not null default now(),
    check (check_out_date > check_in_date)
  );

  create index if not exists room_bookings_org_idx on public.room_bookings (organization_id);
  create index if not exists room_bookings_room_dates_idx
    on public.room_bookings (room_id, check_in_date, check_out_date);
  create index if not exists room_bookings_status_idx on public.room_bookings (organization_id, status);

  alter table public.room_bookings enable row level security;

  drop policy if exists "room_bookings_select" on public.room_bookings;
  drop policy if exists "room_bookings_insert" on public.room_bookings;
  drop policy if exists "room_bookings_update" on public.room_bookings;
  drop policy if exists "room_bookings_delete" on public.room_bookings;

  create policy "room_bookings_select" on public.room_bookings
    for select to authenticated
    using (organization_id = public.current_org_id());
  create policy "room_bookings_insert" on public.room_bookings
    for insert to authenticated
    with check (organization_id = public.current_org_id());
  create policy "room_bookings_update" on public.room_bookings
    for update to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());
  create policy "room_bookings_delete" on public.room_bookings
    for delete to authenticated
    using (organization_id = public.current_org_id());

  -- 4) Link invoice lines to a booking (hotel folio)
  alter table public.invoice_items
    add column if not exists room_booking_id uuid references public.room_bookings (id) on delete set null;

  -- Hotel folio lines may omit product_id when linked to a room booking
  alter table public.invoice_items
    alter column product_id drop not null;

  alter table public.invoice_items
    drop constraint if exists invoice_items_product_or_booking_chk;

  alter table public.invoice_items
    add constraint invoice_items_product_or_booking_chk
    check (product_id is not null or room_booking_id is not null);

  comment on table public.room_types is
    'Hotel catalog: billable room categories (per-night rate). Not inventory stock.';
  comment on table public.rooms is
    'Physical hotel rooms belonging to a room type.';
  comment on table public.room_bookings is
    'Date-range bookings for rooms. Active statuses block overlapping stays on the same room.';

  -- 5) Invoice RPCs: allow hotel folio lines with room_booking_id and null product_id
  create or replace function public.create_invoice_atomic(payload jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_user_id uuid := auth.uid();
    v_org uuid := public.current_org_id();
    v_prefix text := coalesce(nullif(payload->>'prefix', ''), 'AB');
    v_customer_id uuid;
    v_invoice_date date;
    v_notes text;
    v_warehouse_id uuid;
    v_invoice_number text;
    v_invoice_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_booking_id uuid;
    v_qty integer;
    v_stock integer;
    v_product_name text;
    v_is_service boolean;
    v_invoice public.invoices%rowtype;
  begin
    if v_user_id is null then
      raise exception 'Not authenticated';
    end if;
    if v_org is null then
      raise exception 'No organization for current user';
    end if;

    if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
      raise exception 'Invoice must have at least one line item';
    end if;

    v_customer_id := (payload->>'customer_id')::uuid;
    v_invoice_date := coalesce((payload->>'invoice_date')::date, current_date);
    v_notes := nullif(payload->>'notes', '');
    v_warehouse_id := nullif(payload->>'warehouse_id', '')::uuid;

    if v_warehouse_id is null then
      select id into v_warehouse_id
      from public.warehouses
      where is_default = true and is_active = true and organization_id = v_org
      limit 1;
    else
      if not exists (
        select 1 from public.warehouses
        where id = v_warehouse_id and organization_id = v_org
      ) then
        raise exception 'Warehouse not found';
      end if;
    end if;

    if not exists (
      select 1 from public.customers
      where id = v_customer_id and organization_id = v_org
    ) then
      raise exception 'Customer not found';
    end if;

    for v_item in select * from jsonb_array_elements(payload->'items')
    loop
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_booking_id := nullif(v_item->>'room_booking_id', '')::uuid;
      v_qty := (v_item->>'quantity')::integer;

      if v_qty is null or v_qty <= 0 then
        raise exception 'Invalid quantity on invoice line';
      end if;

      if v_booking_id is not null then
        if not exists (
          select 1 from public.room_bookings
          where id = v_booking_id and organization_id = v_org
        ) then
          raise exception 'Room booking not found: %', v_booking_id;
        end if;
        continue;
      end if;

      if v_product_id is null then
        raise exception 'Invoice line needs a product or room booking';
      end if;

      select p.name, coalesce(p.is_service, false)
        into v_product_name, v_is_service
      from public.products p
      where p.id = v_product_id and p.organization_id = v_org;
      if v_product_name is null then
        raise exception 'Product not found: %', v_product_id;
      end if;

      if not v_is_service then
        if v_warehouse_id is not null then
          select coalesce(sum(sm.quantity), 0)::integer into v_stock
          from public.stock_movements sm
          where sm.product_id = v_product_id
            and sm.warehouse_id = v_warehouse_id
            and sm.organization_id = v_org;
        else
          select coalesce(sum(sm.quantity), 0)::integer into v_stock
          from public.stock_movements sm
          where sm.product_id = v_product_id and sm.organization_id = v_org;
        end if;

        if v_stock < v_qty then
          raise exception 'Insufficient stock for % (have %, need %)',
            v_product_name, v_stock, v_qty;
        end if;
      end if;
    end loop;

    v_invoice_number := public.next_invoice_number(v_prefix);

    insert into public.invoices (
      invoice_number, customer_id, invoice_date,
      subtotal, total_cgst, total_sgst, total_igst, round_off, grand_total,
      status, notes, created_by, warehouse_id, organization_id
    ) values (
      v_invoice_number, v_customer_id, v_invoice_date,
      coalesce((payload->>'subtotal')::numeric, 0),
      coalesce((payload->>'total_cgst')::numeric, 0),
      coalesce((payload->>'total_sgst')::numeric, 0),
      coalesce((payload->>'total_igst')::numeric, 0),
      coalesce((payload->>'round_off')::numeric, 0),
      coalesce((payload->>'grand_total')::numeric, 0),
      'issued', v_notes,
      coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id),
      v_warehouse_id,
      v_org
    )
    returning * into v_invoice;

    v_invoice_id := v_invoice.id;

    for v_item in select * from jsonb_array_elements(payload->'items')
    loop
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_booking_id := nullif(v_item->>'room_booking_id', '')::uuid;

      insert into public.invoice_items (
        invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
        taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
        organization_id, imei_serial, batch_number, variant_tag,
        metal_rate_used, gross_weight, net_weight, making_charge_amount, stone_value,
        jewellery_purity, jewellery_huid,
        check_in_date, check_out_date, guest_id_proof, room_booking_id
      ) values (
        v_invoice_id,
        v_product_id,
        coalesce(v_item->>'hsn_code', ''),
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::numeric,
        coalesce((v_item->>'price_overridden')::boolean, false),
        (v_item->>'taxable_value')::numeric,
        (v_item->>'gst_rate')::numeric,
        coalesce((v_item->>'cgst_amount')::numeric, 0),
        coalesce((v_item->>'sgst_amount')::numeric, 0),
        coalesce((v_item->>'igst_amount')::numeric, 0),
        (v_item->>'line_total')::numeric,
        v_org,
        nullif(trim(coalesce(v_item->>'imei_serial', '')), ''),
        nullif(trim(coalesce(v_item->>'batch_number', '')), ''),
        nullif(trim(coalesce(v_item->>'variant_tag', '')), ''),
        nullif(v_item->>'metal_rate_used', '')::numeric,
        nullif(v_item->>'gross_weight', '')::numeric,
        nullif(v_item->>'net_weight', '')::numeric,
        nullif(v_item->>'making_charge_amount', '')::numeric,
        nullif(v_item->>'stone_value', '')::numeric,
        nullif(trim(coalesce(v_item->>'jewellery_purity', '')), ''),
        nullif(trim(coalesce(v_item->>'jewellery_huid', '')), ''),
        nullif(v_item->>'check_in_date', '')::date,
        nullif(v_item->>'check_out_date', '')::date,
        nullif(trim(coalesce(v_item->>'guest_id_proof', '')), ''),
        v_booking_id
      );

      if v_booking_id is not null then
        update public.room_bookings
        set invoice_id = v_invoice_id
        where id = v_booking_id and organization_id = v_org;
        continue;
      end if;

      select coalesce(p.is_service, false) into v_is_service
      from public.products p
      where p.id = v_product_id and p.organization_id = v_org;

      if not coalesce(v_is_service, false) then
        insert into public.stock_movements (
          product_id, movement_type, quantity, reference, reason, created_by,
          warehouse_id, organization_id
        ) values (
          v_product_id,
          'out',
          -abs((v_item->>'quantity')::integer),
          v_invoice_number,
          'Invoice ' || v_invoice_number,
          coalesce(nullif(payload->>'created_by', '')::uuid, v_user_id),
          v_warehouse_id,
          v_org
        );
      end if;
    end loop;

    return to_jsonb(v_invoice);
  end;
  $$;

  create or replace function public.update_invoice_atomic(
    p_invoice_id uuid,
    payload jsonb
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_user_id uuid := auth.uid();
    v_org uuid := public.current_org_id();
    v_invoice public.invoices%rowtype;
    v_customer_id uuid;
    v_invoice_date date;
    v_notes text;
    v_warehouse_id uuid;
    v_force boolean := coalesce((payload->>'force')::boolean, false);
    v_item jsonb;
    v_product_id uuid;
    v_booking_id uuid;
    v_qty integer;
    v_stock integer;
    v_product_name text;
    v_is_service boolean;
  begin
    if v_user_id is null then
      raise exception 'Not authenticated';
    end if;
    if v_org is null then
      raise exception 'No organization for current user';
    end if;

    select * into v_invoice
    from public.invoices
    where id = p_invoice_id and organization_id = v_org
    for update;

    if not found then
      raise exception 'Invoice not found';
    end if;

    if v_invoice.status = 'cancelled' and not v_force then
      raise exception 'Cannot edit a cancelled invoice';
    end if;

    if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
      raise exception 'Invoice must have at least one line item';
    end if;

    v_customer_id := (payload->>'customer_id')::uuid;
    v_invoice_date := coalesce((payload->>'invoice_date')::date, v_invoice.invoice_date);
    v_notes := nullif(payload->>'notes', '');
    v_warehouse_id := coalesce(
      nullif(payload->>'warehouse_id', '')::uuid,
      v_invoice.warehouse_id
    );

    if v_warehouse_id is not null and not exists (
      select 1 from public.warehouses
      where id = v_warehouse_id and organization_id = v_org
    ) then
      raise exception 'Warehouse not found';
    end if;

    if not exists (
      select 1 from public.customers
      where id = v_customer_id and organization_id = v_org
    ) then
      raise exception 'Customer not found';
    end if;

    delete from public.stock_movements
    where reference = v_invoice.invoice_number
      and organization_id = v_org
      and movement_type = 'out';

    update public.room_bookings
    set invoice_id = null
    where invoice_id = p_invoice_id and organization_id = v_org;

    delete from public.invoice_items where invoice_id = p_invoice_id;

    for v_item in select * from jsonb_array_elements(payload->'items')
    loop
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_booking_id := nullif(v_item->>'room_booking_id', '')::uuid;
      v_qty := (v_item->>'quantity')::integer;

      if v_qty is null or v_qty <= 0 then
        raise exception 'Invalid quantity on invoice line';
      end if;

      if v_booking_id is not null then
        if not exists (
          select 1 from public.room_bookings
          where id = v_booking_id and organization_id = v_org
        ) then
          raise exception 'Room booking not found: %', v_booking_id;
        end if;
        continue;
      end if;

      if v_product_id is null then
        raise exception 'Invoice line needs a product or room booking';
      end if;

      select p.name, coalesce(p.is_service, false)
        into v_product_name, v_is_service
      from public.products p
      where p.id = v_product_id and p.organization_id = v_org;
      if v_product_name is null then
        raise exception 'Product not found: %', v_product_id;
      end if;

      if not v_is_service then
        if v_warehouse_id is not null then
          select coalesce(sum(sm.quantity), 0)::integer into v_stock
          from public.stock_movements sm
          where sm.product_id = v_product_id
            and sm.warehouse_id = v_warehouse_id
            and sm.organization_id = v_org;
        else
          select coalesce(sum(sm.quantity), 0)::integer into v_stock
          from public.stock_movements sm
          where sm.product_id = v_product_id and sm.organization_id = v_org;
        end if;

        if v_stock < v_qty then
          raise exception 'Insufficient stock for % (have %, need %)',
            v_product_name, v_stock, v_qty;
        end if;
      end if;
    end loop;

    update public.invoices set
      customer_id = v_customer_id,
      invoice_date = v_invoice_date,
      notes = v_notes,
      warehouse_id = v_warehouse_id,
      subtotal = coalesce((payload->>'subtotal')::numeric, 0),
      total_cgst = coalesce((payload->>'total_cgst')::numeric, 0),
      total_sgst = coalesce((payload->>'total_sgst')::numeric, 0),
      total_igst = coalesce((payload->>'total_igst')::numeric, 0),
      round_off = coalesce((payload->>'round_off')::numeric, 0),
      grand_total = coalesce((payload->>'grand_total')::numeric, 0),
      edited_at = now(),
      edited_by = coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id)
    where id = p_invoice_id and organization_id = v_org
    returning * into v_invoice;

    for v_item in select * from jsonb_array_elements(payload->'items')
    loop
      v_product_id := nullif(v_item->>'product_id', '')::uuid;
      v_booking_id := nullif(v_item->>'room_booking_id', '')::uuid;

      insert into public.invoice_items (
        invoice_id, product_id, hsn_code, quantity, unit_price, price_overridden,
        taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
        organization_id, imei_serial, batch_number, variant_tag,
        metal_rate_used, gross_weight, net_weight, making_charge_amount, stone_value,
        jewellery_purity, jewellery_huid,
        check_in_date, check_out_date, guest_id_proof, room_booking_id
      ) values (
        p_invoice_id,
        v_product_id,
        coalesce(v_item->>'hsn_code', ''),
        (v_item->>'quantity')::integer,
        (v_item->>'unit_price')::numeric,
        coalesce((v_item->>'price_overridden')::boolean, false),
        (v_item->>'taxable_value')::numeric,
        (v_item->>'gst_rate')::numeric,
        coalesce((v_item->>'cgst_amount')::numeric, 0),
        coalesce((v_item->>'sgst_amount')::numeric, 0),
        coalesce((v_item->>'igst_amount')::numeric, 0),
        (v_item->>'line_total')::numeric,
        v_org,
        nullif(trim(coalesce(v_item->>'imei_serial', '')), ''),
        nullif(trim(coalesce(v_item->>'batch_number', '')), ''),
        nullif(trim(coalesce(v_item->>'variant_tag', '')), ''),
        nullif(v_item->>'metal_rate_used', '')::numeric,
        nullif(v_item->>'gross_weight', '')::numeric,
        nullif(v_item->>'net_weight', '')::numeric,
        nullif(v_item->>'making_charge_amount', '')::numeric,
        nullif(v_item->>'stone_value', '')::numeric,
        nullif(trim(coalesce(v_item->>'jewellery_purity', '')), ''),
        nullif(trim(coalesce(v_item->>'jewellery_huid', '')), ''),
        nullif(v_item->>'check_in_date', '')::date,
        nullif(v_item->>'check_out_date', '')::date,
        nullif(trim(coalesce(v_item->>'guest_id_proof', '')), ''),
        v_booking_id
      );

      if v_booking_id is not null then
        update public.room_bookings
        set invoice_id = p_invoice_id
        where id = v_booking_id and organization_id = v_org;
        continue;
      end if;

      select coalesce(p.is_service, false) into v_is_service
      from public.products p
      where p.id = v_product_id and p.organization_id = v_org;

      if not coalesce(v_is_service, false) then
        insert into public.stock_movements (
          product_id, movement_type, quantity, reference, reason, created_by,
          warehouse_id, organization_id
        ) values (
          v_product_id,
          'out',
          -abs((v_item->>'quantity')::integer),
          v_invoice.invoice_number,
          'Invoice ' || v_invoice.invoice_number,
          coalesce(nullif(payload->>'edited_by', '')::uuid, v_user_id),
          v_warehouse_id,
          v_org
        );
      end if;
    end loop;

    return to_jsonb(v_invoice);
  end;
  $$;

  grant execute on function public.create_invoice_atomic(jsonb) to authenticated;
  grant execute on function public.update_invoice_atomic(uuid, jsonb) to authenticated;

  select pg_notify('pgrst', 'reload schema');
