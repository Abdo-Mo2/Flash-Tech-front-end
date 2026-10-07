-- Final order lifecycle reset and admin authorization fix.
-- Run this as a complete migration in Supabase SQL editor.
-- This removes stale trigger/constraint drift and restores the required admin helper.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  username text,
  phone text,
  gender text,
  image text,
  address text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text default 'user';

alter table public.profiles
  alter column role set default 'user';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin'))
  not valid;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists stock_deducted_at timestamptz,
  add column if not exists stock_returned_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists shipping_fee numeric(12,2) not null default 0 check (shipping_fee in (0, 50));

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'));

-- Remove stale duplicate lifecycle triggers from prior migrations.
drop trigger if exists orders_check_status_transition on public.orders;
drop trigger if exists orders_sync_monthly_sales on public.orders;
drop trigger if exists orders_restore_stock_on_cancel on public.orders;

drop trigger if exists orders_restore_stock_on_cancel on public.orders;

drop function if exists public.check_order_status_transition() cascade;
drop function if exists public.sync_monthly_sales_for_order() cascade;
drop function if exists public.restore_stock_for_cancelled_order() cascade;

drop function if exists public.cancel_order(uuid) cascade;

drop function if exists public.create_order_with_items(numeric, jsonb) cascade;
drop function if exists public.create_order_with_items(numeric, jsonb, text, text, text) cascade;
drop function if exists public.create_order_with_items(numeric, jsonb, text, text, text, text) cascade;

create or replace function public.check_order_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    if old.status in ('Cancelled', 'Delivered')
       or (old.status = 'Out for Delivery' and new.status not in ('Delivered', 'Cancelled'))
       or (old.status = 'Shipped' and new.status not in ('Out for Delivery', 'Delivered', 'Cancelled'))
       or (old.status = 'Processing' and new.status not in ('Shipped', 'Out for Delivery', 'Delivered', 'Cancelled')) then
      raise exception 'Invalid order status transition';
    end if;

    if new.status = 'Cancelled' and old.status not in ('Processing', 'Shipped') then
      raise exception 'Contact the store to cancel an order out for delivery';
    end if;

    if new.status = 'Cancelled' then
      new.cancelled_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger orders_check_status_transition
before update of status on public.orders
for each row
execute function public.check_order_status_transition();

create or replace function public.sync_monthly_sales_for_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_month date;
begin
  if new.status = 'Delivered' and old.status is distinct from 'Delivered' then
    target_month := date_trunc('month', new.placed_at)::date;

    insert into public.monthly_sales_orders (order_id, month_start, delivered_at, order_total)
    values (new.id, target_month, now(), new.total)
    on conflict (order_id) do update set
      delivered_at = excluded.delivered_at,
      order_total = excluded.order_total;

    insert into public.monthly_sales_history (month_start, delivered_orders, delivered_revenue, finalized_at)
    select target_month,
           count(*)::integer,
           coalesce(sum(order_total), 0),
           now()
    from public.monthly_sales_orders
    where month_start = target_month
    on conflict (month_start) do update set
      delivered_orders = excluded.delivered_orders,
      delivered_revenue = excluded.delivered_revenue,
      finalized_at = now();

    return new;
  end if;

  if old.status = 'Delivered' and new.status is distinct from 'Delivered' then
    delete from public.monthly_sales_orders where order_id = new.id;
    target_month := date_trunc('month', old.placed_at)::date;

    insert into public.monthly_sales_history (month_start, delivered_orders, delivered_revenue, finalized_at)
    select target_month,
           count(*)::integer,
           coalesce(sum(order_total), 0),
           now()
    from public.monthly_sales_orders
    where month_start = target_month
    on conflict (month_start) do update set
      delivered_orders = excluded.delivered_orders,
      delivered_revenue = excluded.delivered_revenue,
      finalized_at = now();

    return new;
  end if;

  return new;
end;
$$;

create trigger orders_sync_monthly_sales
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.sync_monthly_sales_for_order();

create or replace function public.restore_stock_for_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare item record;
begin
  if new.status = 'Cancelled'
     and old.status is distinct from 'Cancelled'
     and new.stock_returned_at is null then

    for item in
      select product_id, qty
      from public.order_items
      where order_id = new.id and product_id is not null
    loop
      update public.products
      set stock = stock + item.qty
      where id = item.product_id;
    end loop;

    update public.orders
    set stock_returned_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger orders_restore_stock_on_cancel
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.restore_stock_for_cancelled_order();

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare current_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or current_order.user_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;

  if current_order.status = 'Cancelled' then
    raise exception 'Order is already cancelled';
  end if;

  if current_order.status not in ('Processing', 'Shipped') then
    raise exception 'Contact the store to cancel an order out for delivery';
  end if;

  update public.orders
  set status = 'Cancelled'
  where id = p_order_id;
end;
$$;

grant execute on function public.cancel_order(uuid) to authenticated;

create or replace function public.create_order_with_items(
  p_shipping_fee numeric,
  p_items jsonb,
  p_customer_name text,
  p_phone text,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_order_id uuid;
  item record;
  current_product public.products%rowtype;
  calculated_total numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_shipping_fee is null or p_shipping_fee not in (0, 50) then
    raise exception 'Invalid shipping fee';
  end if;

  if p_customer_name is null or length(btrim(p_customer_name)) not between 5 and 20
     or btrim(p_customer_name) !~ '^[[:alpha:] ]+$' then
    raise exception 'Name must be 5–20 letters and spaces';
  end if;

  if p_address is null or length(btrim(p_address)) not between 5 and 20
     or btrim(p_address) !~ '^[[:alpha:] ]+$' then
    raise exception 'Address must be 5–20 letters and spaces';
  end if;

  if p_phone is null or btrim(p_phone) !~ '^[0-9+() -]{7,11}$' then
    raise exception 'Invalid phone number';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'An order must contain between 1 and 50 items';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) element
    where jsonb_typeof(element) <> 'object'
       or element->>'product_id' is null
       or element->>'product_id' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or element->>'qty' !~ '^[1-3]$'
  ) then
    raise exception 'Invalid order item (maximum quantity is 3)';
  end if;

  for item in
    select product_id, sum(qty)::integer as qty
    from jsonb_to_recordset(p_items) as requested(product_id uuid, qty integer)
    group by product_id
    order by product_id
  loop
    select * into current_product
    from public.products
    where id = item.product_id and is_active = true
    for update;

    if not found then
      raise exception 'Product is unavailable';
    end if;

    if current_product.stock < item.qty then
      raise exception 'Insufficient stock';
    end if;

    update public.products
    set stock = stock - item.qty
    where id = item.product_id;

    calculated_total := calculated_total + (current_product.price * item.qty);
  end loop;

  insert into public.orders (
    user_id,
    status,
    total,
    shipping_fee,
    customer_name,
    customer_phone,
    delivery_address,
    stock_deducted_at
  )
  values (
    auth.uid(),
    'Processing',
    calculated_total + p_shipping_fee,
    p_shipping_fee,
    btrim(p_customer_name),
    btrim(p_phone),
    btrim(p_address),
    now()
  )
  returning id into created_order_id;

  insert into public.order_items (order_id, product_id, title, qty, unit_price, line_total)
  select created_order_id,
         p.id,
         p.name,
         requested.qty,
         p.price,
         p.price * requested.qty
  from (
    select product_id, sum(qty)::integer qty
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
    group by product_id
  ) requested
  join public.products p on p.id = requested.product_id;

  return created_order_id;
end;
$$;

grant execute on function public.create_order_with_items(numeric, jsonb, text, text, text) to authenticated;

commit;
