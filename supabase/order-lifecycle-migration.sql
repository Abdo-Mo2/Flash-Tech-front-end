-- Apply once in Supabase SQL Editor AFTER checkout-rls-fix-migration.sql,
-- hero-and-history-migration.sql, admin-policies.sql and admin-workflows-migration.sql.
-- Existing orders have unknown inventory provenance: do NOT mark them deducted or
-- automatically restock them. Only orders created through this RPC are restockable.
begin;

alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists stock_deducted_at timestamptz;
alter table public.orders add column if not exists stock_returned_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;

-- Historical orders may have different item quantities; enforce for new orders in the RPC.
-- Direct writes would bypass pricing, stock and input validation.
revoke insert, update on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
grant update (status) on public.orders to authenticated;

-- Remove the obsolete client-controlled-total overload, if an old deployment retained it.
drop function if exists public.create_order_with_items(numeric, jsonb);
drop function if exists public.create_order_with_items(numeric, jsonb, text, text, text);

create function public.create_order_with_items(
  p_shipping_fee numeric, p_items jsonb, p_customer_name text, p_phone text, p_address text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  created_order_id uuid;
  item record;
  current_product public.products%rowtype;
  calculated_total numeric(12,2) := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_shipping_fee is null or p_shipping_fee not in (0, 50) then raise exception 'Invalid shipping fee'; end if;
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
  if exists (select 1 from jsonb_array_elements(p_items) element
             where jsonb_typeof(element) <> 'object'
                or element->>'product_id' is null or element->>'product_id' !~
                   '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                or element->>'qty' !~ '^[1-3]$') then
    raise exception 'Invalid order item (maximum quantity is 3)';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as requested(product_id uuid, qty integer)
             group by product_id having sum(qty) > 3) then
    raise exception 'Maximum quantity per product is 3';
  end if;

  -- Sorted locks avoid deadlocks between concurrent multi-product purchases.
  for item in select product_id, sum(qty)::integer as qty
              from jsonb_to_recordset(p_items) as requested(product_id uuid, qty integer)
              group by product_id order by product_id loop
    select * into current_product from public.products
      where id = item.product_id and is_active = true for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if current_product.stock < item.qty then raise exception 'Insufficient stock'; end if;
    update public.products set stock = stock - item.qty where id = item.product_id;
    calculated_total := calculated_total + current_product.price * item.qty;
  end loop;

  insert into public.orders (user_id, status, total, shipping_fee, customer_name,
                             customer_phone, delivery_address, stock_deducted_at)
  values (auth.uid(), 'Processing', calculated_total + p_shipping_fee, p_shipping_fee,
          btrim(p_customer_name), btrim(p_phone), btrim(p_address), now())
  returning id into created_order_id;

  insert into public.order_items (order_id, product_id, title, qty, unit_price, line_total)
  select created_order_id, p.id, p.name, requested.qty, p.price, p.price * requested.qty
  from (select product_id, sum(qty)::integer qty
        from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
        group by product_id) requested
  join public.products p on p.id = requested.product_id;
  return created_order_id;
end;
$$;
revoke all on function public.create_order_with_items(numeric, jsonb, text, text, text) from public;
grant execute on function public.create_order_with_items(numeric, jsonb, text, text, text) to authenticated;
-- The two-argument checkout endpoint was already removed above with DROP FUNCTION IF EXISTS.

-- Block reopening cancelled/delivered orders and transitions backwards. Only the
-- admin policy permits direct status edits; customers use cancel_order below.
create or replace function public.check_order_status_transition()
returns trigger language plpgsql set search_path = public, pg_temp as $$
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
    if new.status = 'Cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_check_status_transition on public.orders;
create trigger orders_check_status_transition before update of status on public.orders
for each row execute function public.check_order_status_transition();

-- Replaces the historical restoration trigger. The row lock taken by UPDATE of
-- orders serializes cancellation; the marker and provenance prevent double returns.
create or replace function public.restore_stock_for_cancelled_order()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare item record;
begin
  if new.status = 'Cancelled' and old.status is distinct from 'Cancelled' and new.stock_returned_at is null then
    for item in select product_id, qty from public.order_items where order_id = new.id and product_id is not null loop
      update public.products set stock = stock + item.qty where id = item.product_id;
      if not found then raise exception 'Cannot restore stock for missing product'; end if;
    end loop;
    update public.orders set stock_returned_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

-- Keep the trigger idempotent so status changes once, then re-saving without a real change does not re-trigger stock restoration.
drop trigger if exists orders_restore_stock_on_cancel on public.orders;
create trigger orders_restore_stock_on_cancel
after update of status on public.orders
for each row when (old.status is distinct from new.status)
execute function public.restore_stock_for_cancelled_order();

create or replace function public.cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare current_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found or current_order.user_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;
  if current_order.status = 'Cancelled' then raise exception 'Order is already cancelled'; end if;
  if current_order.status not in ('Processing', 'Shipped') then
    raise exception 'Contact the store to cancel an order out for delivery';
  end if;
  update public.orders set status = 'Cancelled' where id = p_order_id;
end;
$$;
revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;

-- Prevent an owner from editing their role even if old broad update policies exist.
create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only an administrator may change roles';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
for each row execute function public.protect_profile_role();

commit;
