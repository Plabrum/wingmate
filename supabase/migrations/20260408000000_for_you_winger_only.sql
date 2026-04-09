-- Add winger_only parameter to get_discover_pool.
-- When winger_only = true (used by the "For You" tab), only return profiles
-- that have a pending suggestion from any of the viewer's wingers.
-- Existing behaviour (winger_only = false) is unchanged.

create or replace function public.get_discover_pool(
  viewer_id        uuid,
  filter_winger_id uuid    default null,
  page_size        int     default 20,
  page_offset      int     default 0,
  winger_only      boolean default false
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
  join       public.dating_profiles  vdp  on vdp.user_id = viewer_id
  left join  public.decisions        d    on  d.actor_id     = viewer_id
                                          and d.recipient_id = dp.user_id
                                          and d.decision     is null
                                          and d.suggested_by is not null
  left join  public.profiles         s    on s.id = d.suggested_by
  where
    dp.is_active         = true
    and dp.dating_status = 'open'
    and dp.user_id       != viewer_id
    and dp.city          = vdp.city
    and (
      vdp.interested_gender = '{}'::public.gender[]
      or p.gender = any(vdp.interested_gender)
    )
    and extract(year from age(p.date_of_birth))::int >= vdp.age_from
    and (
      vdp.age_to is null
      or extract(year from age(p.date_of_birth))::int <= vdp.age_to
    )
    and (
      vdp.religious_preference is null
      or dp.religion = vdp.religious_preference
    )
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = viewer_id
        and  ex.recipient_id = dp.user_id
        and  ex.decision     is not null
    )
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = dp.user_id
        and  ex.recipient_id = viewer_id
        and  ex.decision     = 'approved'
    )
    -- per-winger tab: restrict to that winger's pending suggestions
    and (
      filter_winger_id is null
      or (d.suggested_by = filter_winger_id and d.decision is null)
    )
    -- For You tab: require any pending winger suggestion
    and (
      not winger_only
      or d.id is not null
    )
  order by
    (d.id is not null) desc,
    dp.created_at desc
  limit  page_size
  offset page_offset
$$;
