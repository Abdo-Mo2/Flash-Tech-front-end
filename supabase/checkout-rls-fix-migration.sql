-- Checkout fix: allow normal (non-admin) customers to place orders.
--
-- Problem
-- -------
-- public.create_order_with_items was declared `security invoker`, so it ran
-- with the caller's privileges under RLS. It locks product rows with
-- `SELECT ... FOR UPDATE`. In Postgres, SELECT ... FOR UPDATE additionally
-- requires the row to satisfy an UPDATE policy's USING clause. Only admins
-- have an UPDATE policy on public.products, so for every normal customer the
-- locked select matched zero rows and the function raised
-- 'Product is unavailable' ("One of the products in your cart is no longer
-- available") even though the product was fine.
--
-- Fix
-- ---
-- Recreate the function as `security definer` owned by the migration runner
-- (a privileged role). Price/stock are still read from the database, the
-- caller identity still comes from auth.uid(), and execute is limited to
-- authenticated users. search_path is pinned so the definer context cannot be
-- hijacked.
--
-- Run after order-security-migration.sql.

create or replace function public.create_order_with_items(p_shipping_fee numeric, p_items jsonb)
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
  if p_shipping_fee not in (0, 50) then
    raise exception 'Invalid shipping fee';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order must contain at least one item';
  end if;

  for item in
    select product_id, qty
    from jsonb_to_recordset(p_items) as requested(product_id uuid, qty integer)
  loop
    if item.product_id is null or item.qty < 1 then
      raise exception 'Invalid order item';
    end if;

    select * into current_product
    from public.products
    where id = item.product_id and is_active = true
    for update;

    if not found then
      raise exception 'Product is unavailable';
    end if;
    if current_product.stock < item.qty then
      raise exception 'Insufficient stock for %', current_product.name;
    end if;

    update public.products set stock = stock - item.qty where id = current_product.id;
    calculated_total := calculated_total + (current_product.price * item.qty);
  end loop;

  calculated_total := calculated_total + p_shipping_fee;
  insert into public.orders (user_id, status, total, shipping_fee)
  values (auth.uid(), 'Processing', calculated_total, p_shipping_fee)
  returning id into created_order_id;

  for item in
    select product_id, qty
    from jsonb_to_recordset(p_items) as requested(product_id uuid, qty integer)
  loop
    select * into current_product from public.products where id = item.product_id;
    insert into public.order_items (order_id, product_id, title, qty, unit_price, line_total)
    values (created_order_id, current_product.id, current_product.name, item.qty,
      current_product.price, current_product.price * item.qty);
  end loop;

  return created_order_id;
end;
$$;

-- Definer functions should not be executable by the whole anon world.
revoke all on function public.create_order_with_items(numeric, jsonb) from public;
grant execute on function public.create_order_with_items(numeric, jsonb) to authenticated;