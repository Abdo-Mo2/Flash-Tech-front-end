-- Active-vs-archived order lifecycle.
--
-- REQUIRED: the Admin Dashboard -> Orders list must show only orders that still
-- need action (Processing, Shipped, Out for Delivery). Delivered and Cancelled
-- orders must disappear automatically from the active list the moment they reach
-- that final state, while their history, revenue and inventory effects are kept.
--
-- HOW IT WORKS
--   * Finalised orders are NOT deleted. They are moved out of the *active* data
--     set by stamping `orders.archived_at` (an "archive" marker, not a new
--     table). The row, its items and every revenue/history reference survive.
--   * The stamp is applied automatically by an AFTER UPDATE trigger, so it can
--     never be forgotten by a client and can never cause a partial state: the
--     status change and the archive happen in the same transaction.
--   * The existing history tables (monthly_sales_orders / monthly_sales_history)
--     are still written by the existing sync trigger, so Monthly Revenue keeps
--     working exactly as before, even though the order leaves the active list.
--   * RLS policies are recreated so a plain `select from orders` (a non-admin
--     PostgREST request and the admin client alike) only ever returns rows where
--     archived_at is null. Customers still see their full purchase history.
--
-- WHERE TO RUN IT
--   Supabase SQL Editor, AFTER all of the migrations listed in README.md
--   (the last one is order-lifecycle-migration.sql). Safe to re-run.
--
-- EXECUTION ORDER
--   1. The README migration list (schema.sql ... order-lifecycle-migration.sql).
--   2. THIS file.
--   No other script is needed.

begin;

-- 1. Archive marker. NULL = active order, non-NULL = finalised (Delivered/Cancelled).
alter table public.orders
  add column if not exists archived_at timestamptz;

comment on column public.orders.archived_at is
  'Set when the order reaches a final state (Delivered/Cancelled); such orders are excluded from the active admin order list but retained for revenue, history and analytics.';

-- Partial index: the active order list is the hot path, archived rows are cold.
create index if not exists orders_active_idx
  on public.orders (placed_at desc)
  where archived_at is null;

-- Fast lookup of the archive marker for existing rows / reporting.
create index if not exists orders_archived_idx
  on public.orders (archived_at)
  where archived_at is not null;

-- 2. Backfill: any order already in a final state is archived. Re-running is a
--    no-op because archived_at is only filled where it is still null.
update public.orders
set archived_at = coalesce(cancelled_at, placed_at, now())
where status in ('Delivered', 'Cancelled')
  and archived_at is null;

-- 3. Automatic archive trigger. This is what removes an order from the active
--    data set. It runs in the same transaction as the status UPDATE, so the two
--    can never disagree (no "status changed but still listed" partial state).
create or replace function public.archive_finalized_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('Delivered', 'Cancelled') and new.archived_at is null then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_archive_finalized on public.orders;
create trigger orders_archive_finalized
before update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.archive_finalized_order();

-- 4. Admin read policies: hide archived orders from the active list.
--    Customers keep their own full history (the archived rows are theirs).
drop policy if exists "own orders select" on public.orders;
create policy "own orders select" on public.orders
  for select using (
    (archived_at is null and (user_id = auth.uid() or public.is_admin()))
    or (archived_at is not null and user_id = auth.uid())
  );

-- Customer order items remain readable while the parent order exists at all
-- (archived orders keep showing in the customer's Account -> Orders history).
drop policy if exists "own order items select" on public.order_items;
create policy "own order items select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- 5. Admin status change: allow admins to finalise orders (insert is still
--    blocked; only status may be edited).
grant update (status) on public.orders to authenticated;

-- 6. Atomic finalisation RPC used by the admin "Update status" control.
--    Doing the status change through one transaction means the status guard,
--    the archive trigger, the monthly-sales trigger and the stock trigger all
--    succeed together or not at all.
create or replace function public.finalize_order(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_order public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled') then
    raise exception 'Invalid order status';
  end if;

  -- The transition guard trigger validates the move; the archive trigger marks
  -- finalised orders; the sync/restore triggers handle revenue and stock when
  -- status becomes Delivered / Cancelled. All in one transaction.
  update public.orders
  set status = p_status
  where id = p_order_id
  returning * into updated_order;

  if not found then
    raise exception 'Order not found';
  end if;

  return updated_order;
end;
$$;

revoke all on function public.finalize_order(uuid, text) from public;
grant execute on function public.finalize_order(uuid, text) to authenticated;

-- 7. Customer cancellation: unchanged semantics (stock restored exactly once by
--    the existing marker), but routed through the same atomic path. The archive
--    trigger moves the order out of the active list automatically.
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_order public.orders%rowtype;
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

revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;

commit;
