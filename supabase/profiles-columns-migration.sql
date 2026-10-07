-- Brings public.profiles in line with what the Angular client reads and writes.
--
-- Why this is needed
-- ------------------
-- The deployed `profiles` table only has: id, email, role, created_at.
-- Every other profile column — username, first_name, last_name, phone, gender,
-- image, address, updated_at — is absent, so profile reads/writes and the admin
-- order customer lookup fail with:
--   column profiles.first_name does not exist
--
-- Columns are added with IF NOT EXISTS, so this is safe to run on a database
-- where some (or all) of them already exist. It never drops or rewrites data.
--
-- Run in Supabase SQL Editor. Safe to run before or after
-- order-lifecycle-migration.sql; it has no dependency on it.

begin;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists image text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at meaningful for profile edits.
create or replace function public.set_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();

-- Backfill names for existing accounts from the auth metadata that
-- handle_new_user already writes at signup, so the admin order screens show a
-- real customer name instead of a blank.
update public.profiles p
set username   = coalesce(p.username, split_part(coalesce(u.email, ''), '@', 1)),
    first_name = coalesce(p.first_name, u.raw_user_meta_data->>'first_name'),
    last_name  = coalesce(p.last_name, u.raw_user_meta_data->>'last_name')
from auth.users u
where u.id = p.id
  and (p.username is null or p.first_name is null);

commit;
