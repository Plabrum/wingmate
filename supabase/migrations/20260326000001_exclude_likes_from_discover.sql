-- Exclude from the discover pool any candidate who has already liked (approved)
-- the viewer. Those profiles appear in the "Likes You" tab instead.
-- Matched profiles are unaffected: a match requires the viewer to have also
-- approved, so they are already excluded by the existing "acted on" filter.

create or replace function public.get_discover_pool(
  viewer_id        uuid,
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
  -- viewer's own dating profile — used to read preferences
  join       public.dating_profiles  vdp  on vdp.user_id = viewer_id
  -- any pending wingperson suggestion for this card (optional join)
  left join  public.decisions        d    on  d.actor_id     = viewer_id
                                          and d.recipient_id = dp.user_id
                                          and d.decision     is null
                                          and d.suggested_by is not null
  left join  public.profiles         s    on s.id = d.suggested_by
  where
    dp.is_active         = true
    and dp.dating_status = 'open'
    and dp.user_id       != viewer_id
    -- same city as viewer
    and dp.city          = vdp.city
    -- viewer's interested_gender must include this candidate's gender
    -- (empty array = open to all)
    and (
      vdp.interested_gender = '{}'::public.gender[]
      or p.gender = any(vdp.interested_gender)
    )
    -- candidate's age must fall within viewer's desired range
    and extract(year from age(p.date_of_birth))::int >= vdp.age_from
    and (
      vdp.age_to is null
      or extract(year from age(p.date_of_birth))::int <= vdp.age_to
    )
    -- candidate's religion must match viewer's preference (null = no preference)
    and (
      vdp.religious_preference is null
      or dp.religion = vdp.religious_preference
    )
    -- exclude profiles the viewer has already acted on
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = viewer_id
        and  ex.recipient_id = dp.user_id
        and  ex.decision     is not null
    )
    -- exclude profiles that have already liked the viewer
    -- (they appear in the Likes You tab; matched profiles are already
    --  excluded above since a match requires the viewer to have approved)
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = dp.user_id
        and  ex.recipient_id = viewer_id
        and  ex.decision     = 'approved'
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
