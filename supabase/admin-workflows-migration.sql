-- Admin workflow support: hero image storage and safe role management.
-- Apply after hero-and-history-migration.sql and admin-policies.sql.

insert into storage.buckets (id, name, public)
values ('hero-images', 'hero-images', true),
       ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read hero images" on storage.objects;
create policy "public read hero images" on storage.objects
  for select using (bucket_id = 'hero-images');

drop policy if exists "admins upload hero images" on storage.objects;
create policy "admins upload hero images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hero-images' and public.is_admin());

drop policy if exists "admins update hero images" on storage.objects;
create policy "admins update hero images" on storage.objects
  for update to authenticated
  using (bucket_id = 'hero-images' and public.is_admin())
  with check (bucket_id = 'hero-images' and public.is_admin());

drop policy if exists "admins delete hero images" on storage.objects;
create policy "admins delete hero images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'hero-images' and public.is_admin());

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

alter table public.profiles add column if not exists created_at timestamptz not null default now();

create or replace function public.set_user_role(target_user_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_admins integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own administrator access';
  end if;
  if target_role not in ('user', 'admin') then
    raise exception 'Invalid role';
  end if;
  if target_role = 'user' then
    select count(*) into remaining_admins from public.profiles where role = 'admin' and id <> target_user_id;
    if remaining_admins < 1 then
      raise exception 'At least one administrator must remain';
    end if;
  end if;
  update public.profiles set role = target_role where id = target_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

grant execute on function public.set_user_role(uuid, text) to authenticated;
