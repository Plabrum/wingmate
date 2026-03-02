-- Replace city enum with Boston and New York only.
-- Postgres does not support DROP VALUE on enums, so we recreate the type.
-- get_discover_pool and get_wing_pool depend on the type, so we drop/recreate them too.

-- 1. Drop dependent functions
drop function if exists public.get_discover_pool(uuid, uuid, int, int);
drop function if exists public.get_wing_pool(uuid, uuid, int, int);

-- 2. Add a temporary text column to preserve data
alter table public.dating_profiles add column city_tmp text;
update public.dating_profiles set city_tmp = city::text;
alter table public.dating_profiles drop column city;

-- 3. Recreate the enum with the new values
drop type public.city;
create type public.city as enum (
  'Boston',
  'New York'
);

-- 4. Restore the column using the new enum
--    Rows with old city values will be set to NULL (safe default until user updates profile)
alter table public.dating_profiles
  add column city public.city;

update public.dating_profiles
  set city = city_tmp::public.city
  where city_tmp in ('Boston', 'New York');

-- Rows with unrecognised city values default to 'New York'
update public.dating_profiles
  set city = 'New York'
  where city is null;

alter table public.dating_profiles drop column city_tmp;

-- 5. Restore NOT NULL constraint
alter table public.dating_profiles alter column city set not null;

-- 6. Restore index
create index on public.dating_profiles (is_active, city);

-- 7. Recreate get_discover_pool
create function public.get_discover_pool(
  viewer_id       uuid,
  filter_winger_id uuid    default null,
  page_size        int     default 20,
  page_offset      int     default 0
)
returns table (
  profile_id     uuid,
  user_id        uuid,
  chosen_name    text,
  gender         public.gender,
  age            int,
  city           public.city,
  bio            text,
  dating_status  public.dating_status,
  interests      public.interest[],
  first_photo    text,
  wing_note      text,
  suggested_by   uuid,
  suggester_name text
)
language sql security definer stable as $$
  select
    dp.id                                                         as profile_id,
    dp.user_id,
    p.chosen_name,
    p.gender,
    extract(year from age(p.date_of_birth))::int                  as age,
    dp.city,
    dp.bio,
    dp.dating_status,
    dp.interests,
    (
      select storage_url
      from   public.profile_photos
      where  dating_profile_id = dp.id
        and  approved_at is not null
      order  by display_order
      limit  1
    )                                                             as first_photo,
    d.note                                                        as wing_note,
    d.suggested_by,
    s.chosen_name                                                 as suggester_name
  from       public.dating_profiles  dp
  join       public.profiles         p    on p.id   = dp.user_id
  -- viewer's own dating profile — used to read city + interested_gender prefs
  join       public.dating_profiles  vdp  on vdp.user_id = viewer_id
  -- any pending wingperson suggestion for this card (optional join)
  left join  public.decisions        d    on  d.actor_id     = viewer_id
                                          and d.recipient_id = dp.user_id
                                          and d.decision     is null
                                          and d.suggested_by is not null
  left join  public.profiles         s    on s.id = d.suggested_by
  where
    dp.is_active      = true
    and dp.dating_status = 'open'
    and dp.user_id    != viewer_id
    -- same city as viewer
    and dp.city        = vdp.city
    -- viewer's interested_gender must include this candidate's gender
    -- (empty array = open to all)
    and (
      vdp.interested_gender = '{}'::public.gender[]
      or p.gender = any(vdp.interested_gender)
    )
    -- exclude profiles the viewer has already acted on
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = viewer_id
        and  ex.recipient_id = dp.user_id
        and  ex.decision     is not null
    )
    -- winger tab: only show profiles that winger has suggested
    and (
      filter_winger_id is null
      or (d.suggested_by = filter_winger_id and d.decision is null)
    )
  order by
    (d.id is not null) desc,  -- pending suggestions float to top
    dp.created_at desc
  limit  page_size
  offset page_offset
$$;

-- 8. Recreate get_wing_pool
create function public.get_wing_pool(
  winger_id uuid,
  dater_id  uuid,
  page_size  int default 20,
  page_offset int default 0
)
returns table (
  profile_id    uuid,
  user_id       uuid,
  chosen_name   text,
  gender        public.gender,
  age           int,
  city          public.city,
  bio           text,
  dating_status public.dating_status,
  interests     public.interest[],
  first_photo   text
)
language sql security definer stable as $$
  select
    dp.id,
    dp.user_id,
    p.chosen_name,
    p.gender,
    extract(year from age(p.date_of_birth))::int as age,
    dp.city,
    dp.bio,
    dp.dating_status,
    dp.interests,
    (
      select storage_url
      from   public.profile_photos
      where  dating_profile_id = dp.id
        and  approved_at is not null
      order  by display_order
      limit  1
    ) as first_photo
  from      public.dating_profiles  dp
  join      public.profiles         p        on p.id   = dp.user_id
  -- dater's profile — used to read their preferences
  join      public.dating_profiles  dater_dp on dater_dp.user_id = dater_id
  where
    dp.is_active      = true
    and dp.dating_status = 'open'
    and dp.user_id    != dater_id
    and dp.user_id    != winger_id
    -- match dater's city and interested_gender
    and dp.city        = dater_dp.city
    and (
      dater_dp.interested_gender = '{}'::public.gender[]
      or p.gender = any(dater_dp.interested_gender)
    )
    -- exclude profiles the dater has already decided on
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = dater_id
        and  ex.recipient_id = dp.user_id
    )
    -- confirm winger is active for this dater (defence-in-depth; RLS handles insert)
    and exists (
      select 1
      from   public.contacts c
      where  c.user_id           = dater_id
        and  c.winger_id         = winger_id
        and  c.wingperson_status = 'active'
    )
  order by dp.created_at desc
  limit  page_size
  offset page_offset
$$;
