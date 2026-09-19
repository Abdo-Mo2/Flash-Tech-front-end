-- Apply after public.is_admin() exists.
-- These policies protect the admin UI operations at the database boundary.

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.orders enable row level security;

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admins insert products" on public.products;
create policy "admins insert products" on public.products
  for insert with check (public.is_admin());
drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete products" on public.products;
create policy "admins delete products" on public.products
  for delete using (public.is_admin());

drop policy if exists "admins insert categories" on public.categories;
create policy "admins insert categories" on public.categories
  for insert with check (public.is_admin());
drop policy if exists "admins update categories" on public.categories;
create policy "admins update categories" on public.categories
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete categories" on public.categories;
create policy "admins delete categories" on public.categories
  for delete using (public.is_admin());

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
