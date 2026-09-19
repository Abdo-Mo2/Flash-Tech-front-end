-- Flash Tech product catalog migration.
--
-- Run this in the Supabase SQL editor after the existing profiles table and
-- public.is_admin() helper have been created. It intentionally uses no
-- service_role credentials and keeps RLS enabled.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug = lower(slug) and slug !~ '[[:space:]]'),
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  category text not null check (length(btrim(category)) > 0),
  brand text,
  stock integer not null default 0 check (stock >= 0),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_category_idx
  on public.products (category, created_at desc) where is_active = true;
create index if not exists products_brand_idx on public.products (brand);
create index if not exists products_specifications_idx
  on public.products using gin (specifications);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function public.set_products_updated_at();

alter table public.products enable row level security;

-- Table grants permit requests to reach the RLS policies; they do not bypass RLS.
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products
for select
using (is_active = true or public.is_admin());

drop policy if exists "admins insert products" on public.products;
create policy "admins insert products" on public.products
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete products" on public.products;
create policy "admins delete products" on public.products
for delete
to authenticated
using (public.is_admin());
