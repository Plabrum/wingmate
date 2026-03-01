-- Replace city enum with Boston and New York only.
-- Postgres does not support DROP VALUE on enums, so we recreate the type.

-- 1. Add a temporary text column to preserve data
alter table public.dating_profiles add column city_tmp text;
update public.dating_profiles set city_tmp = city::text;
alter table public.dating_profiles drop column city;

-- 2. Recreate the enum with the new values
drop type public.city;
create type public.city as enum (
  'Boston',
  'New York'
);

-- 3. Restore the column using the new enum
--    Rows with old city values will be set to NULL (safe default until user updates profile)
alter table public.dating_profiles
  add column city public.city;

update public.dating_profiles
  set city = city_tmp::public.city
  where city_tmp in ('Boston', 'New York');

alter table public.dating_profiles drop column city_tmp;

-- 4. Restore NOT NULL constraint (comment out if you want to allow NULL during transition)
alter table public.dating_profiles alter column city set not null;

-- 5. Restore index
create index on public.dating_profiles (is_active, city);
