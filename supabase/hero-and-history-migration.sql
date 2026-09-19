-- Admin-controlled home hero slides and immutable monthly delivered-sales snapshots.
-- Run after the prior migrations. No sample slides or statistics are created.

create extension if not exists pgcrypto;

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 3 and 140),
  description text not null default '' check (length(description) <= 600),
  image_url text,
  cta_text text not null default 'Shop now' check (length(btrim(cta_text)) between 2 and 50),
  cta_destination text not null check (cta_destination like '/%'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_sales_history (
  month_start date primary key,
  delivered_orders integer not null check (delivered_orders >= 0),
  delivered_revenue numeric(12,2) not null check (delivered_revenue >= 0),
  finalized_at timestamptz not null default now()
);

create table if not exists public.monthly_sales_orders (
  order_id uuid primary key references public.orders(id) on delete cascade,
  month_start date not null,
  delivered_at timestamptz not null,
  order_total numeric(12,2) not null check (order_total >= 0)
);

alter table public.orders
  add column if not exists stock_returned_at timestamptz;

alter table public.hero_slides enable row level security;
alter table public.monthly_sales_history enable row level security;
grant select on public.hero_slides to anon, authenticated;
grant insert, update, delete on public.hero_slides to authenticated;
grant select, insert, update on public.monthly_sales_history to authenticated;
grant select on public.monthly_sales_orders to authenticated;

create or replace function public.set_hero_slides_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists hero_slides_updated_at on public.hero_slides;
create trigger hero_slides_updated_at before update on public.hero_slides for each row execute function public.set_hero_slides_updated_at();

drop policy if exists "public read active hero slides" on public.hero_slides;
create policy "public read active hero slides" on public.hero_slides for select using (is_active or public.is_admin());
drop policy if exists "admins manage hero slides" on public.hero_slides;
create policy "admins manage hero slides" on public.hero_slides for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins read monthly sales history" on public.monthly_sales_history;
create policy "admins read monthly sales history" on public.monthly_sales_history for select to authenticated using (public.is_admin());
drop policy if exists "admins save monthly sales history" on public.monthly_sales_history;
create policy "admins save monthly sales history" on public.monthly_sales_history for insert to authenticated with check (public.is_admin());
drop policy if exists "admins update monthly sales history" on public.monthly_sales_history;
create policy "admins update monthly sales history" on public.monthly_sales_history for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.monthly_sales_orders enable row level security;
drop policy if exists "admins read monthly sales orders" on public.monthly_sales_orders;
create policy "admins read monthly sales orders" on public.monthly_sales_orders for select to authenticated using (public.is_admin());

create or replace function public.finalize_monthly_sales(p_month_start date)
returns public.monthly_sales_history
language plpgsql security invoker set search_path = public as $$
declare summary public.monthly_sales_history;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.monthly_sales_history (month_start, delivered_orders, delivered_revenue, finalized_at)
  select date_trunc('month', p_month_start)::date, count(*)::integer, coalesce(sum(total), 0), now()
  from public.orders
  where status = 'Delivered'
    and placed_at >= date_trunc('month', p_month_start)
    and placed_at < date_trunc('month', p_month_start) + interval '1 month'
  on conflict (month_start) do update set delivered_orders = excluded.delivered_orders, delivered_revenue = excluded.delivered_revenue, finalized_at = now()
  returning * into summary;
  return summary;
end;
$$;
grant execute on function public.finalize_monthly_sales(date) to authenticated;

create or replace function public.sync_monthly_sales_for_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_month date;
begin
  if new.status = 'Delivered' then
    target_month := date_trunc('month', new.placed_at)::date;
    insert into public.monthly_sales_orders (order_id, month_start, delivered_at, order_total)
    values (new.id, target_month, now(), new.total)
    on conflict (order_id) do update set delivered_at = excluded.delivered_at, order_total = excluded.order_total;
  elsif old.status = 'Delivered' then
    delete from public.monthly_sales_orders where order_id = new.id;
    target_month := date_trunc('month', old.placed_at)::date;
  else
    return new;
  end if;

  insert into public.monthly_sales_history (month_start, delivered_orders, delivered_revenue, finalized_at)
  select target_month, count(*)::integer, coalesce(sum(order_total), 0), now()
  from public.monthly_sales_orders where month_start = target_month
  on conflict (month_start) do update set delivered_orders = excluded.delivered_orders, delivered_revenue = excluded.delivered_revenue, finalized_at = now();
  return new;
end;
$$;

drop trigger if exists orders_sync_monthly_sales on public.orders;
create trigger orders_sync_monthly_sales
after update of status on public.orders
for each row when (old.status is distinct from new.status)
execute function public.sync_monthly_sales_for_order();

-- A cancellation returns each reserved item exactly once. The marker protects
-- against repeated edits, double-clicks, and a cancelled order being saved again.
create or replace function public.restore_stock_for_cancelled_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare item record;
begin
  if new.status = 'Cancelled' and old.status <> 'Cancelled' and new.stock_returned_at is null then
    for item in select product_id, qty from public.order_items where order_id = new.id loop
      if item.product_id is not null then
        update public.products set stock = stock + item.qty where id = item.product_id;
      end if;
    end loop;
    update public.orders set stock_returned_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restore_stock_on_cancel on public.orders;
create trigger orders_restore_stock_on_cancel
after update of status on public.orders
for each row when (old.status is distinct from new.status)
execute function public.restore_stock_for_cancelled_order();

-- Initialize history for orders that were already delivered before this
-- migration. Re-running remains safe because order_id is unique.
insert into public.monthly_sales_orders (order_id, month_start, delivered_at, order_total)
select id, date_trunc('month', placed_at)::date, placed_at, total
from public.orders where status = 'Delivered'
on conflict (order_id) do nothing;

insert into public.monthly_sales_history (month_start, delivered_orders, delivered_revenue, finalized_at)
select month_start, count(*)::integer, coalesce(sum(order_total), 0), now()
from public.monthly_sales_orders group by month_start
on conflict (month_start) do update set delivered_orders = excluded.delivered_orders, delivered_revenue = excluded.delivered_revenue, finalized_at = now();
