-- Apply the viewer's age range and religious preference filters to the
-- Likes You pool and count, matching the behaviour of get_discover_pool.

create or replace function public.get_likes_you_pool(
  viewer_id   uuid,
  page_size   int default 20,
  page_offset int default 0
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
    dp.user_id                                                    as profile_id,
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
    pending_sug.note                                              as wing_note,
    pending_sug.suggested_by,
    s.chosen_name                                                 as suggester_name
  from       public.decisions        lk
  join       public.profiles         p    on p.id   = lk.actor_id
  join       public.dating_profiles  dp   on dp.user_id = lk.actor_id
  -- viewer's own dating profile — used to read preferences
  join       public.dating_profiles  vdp  on vdp.user_id = viewer_id
  -- pending wing suggestion from this same person (optional)
  left join  public.decisions        pending_sug
               on  pending_sug.actor_id     = viewer_id
               and pending_sug.recipient_id = lk.actor_id
               and pending_sug.decision     is null
               and pending_sug.suggested_by is not null
  left join  public.profiles         s    on s.id = pending_sug.suggested_by
  where
    lk.recipient_id      = viewer_id
    and lk.decision      = 'approved'
    -- liker must still be available
    and dp.is_active     = true
    and dp.dating_status = 'open'
    -- liker's age must fall within viewer's desired range
    and extract(year from age(p.date_of_birth))::int >= vdp.age_from
    and (
      vdp.age_to is null
      or extract(year from age(p.date_of_birth))::int <= vdp.age_to
    )
    -- liker's religion must match viewer's preference (null = no preference)
    and (
      vdp.religious_preference is null
      or dp.religion = vdp.religious_preference
    )
    -- viewer hasn't decided on this person yet
    and not exists (
      select 1
      from   public.decisions ex
      where  ex.actor_id     = viewer_id
        and  ex.recipient_id = lk.actor_id
        and  ex.decision     is not null
    )
    -- no match already exists between them
    and not exists (
      select 1
      from   public.matches m
      where  (m.user_a_id = viewer_id and m.user_b_id = lk.actor_id)
          or (m.user_a_id = lk.actor_id and m.user_b_id = viewer_id)
    )
  order by lk.created_at desc
  limit  page_size
  offset page_offset
$$;


create or replace function public.get_likes_you_count(
  viewer_id uuid
)
returns bigint
language sql security definer stable as $$
  select count(*)
  from       public.decisions        lk
  join       public.profiles         p    on p.id = lk.actor_id
  join       public.dating_profiles  dp   on dp.user_id = lk.actor_id
  join       public.dating_profiles  vdp  on vdp.user_id = viewer_id
  where
    lk.recipient_id      = viewer_id
    and lk.decision      = 'approved'
    and dp.is_active     = true
    and dp.dating_status = 'open'
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
        and  ex.recipient_id = lk.actor_id
        and  ex.decision     is not null
    )
    and not exists (
      select 1
      from   public.matches m
      where  (m.user_a_id = viewer_id and m.user_b_id = lk.actor_id)
          or (m.user_a_id = lk.actor_id and m.user_b_id = viewer_id)
    )
$$;
