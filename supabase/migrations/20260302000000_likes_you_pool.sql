-- ============================================================
-- Migration: Likes You pool RPC functions
-- ============================================================

-- get_likes_you_pool
-- Returns paginated cards for people who have already liked the viewer.
-- Returns the same columns as get_discover_pool so the same DiscoverCard
-- type can be reused on the client.
--
-- NOTE: profile_id is dp.user_id (not dp.id) so that recordDecision(
--   viewer_id, card.profile_id, ...) inserts a valid FK into decisions
--   which references profiles(id), not dating_profiles(id).
create function public.get_likes_you_pool(
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
    -- expose any pending wing suggestion for this liker (edge case)
    pending_sug.note                                              as wing_note,
    pending_sug.suggested_by,
    s.chosen_name                                                 as suggester_name
  from       public.decisions        lk
  join       public.profiles         p    on p.id   = lk.actor_id
  join       public.dating_profiles  dp   on dp.user_id = lk.actor_id
  -- pending wing suggestion from this same person (optional)
  left join  public.decisions        pending_sug
               on  pending_sug.actor_id     = viewer_id
               and pending_sug.recipient_id = lk.actor_id
               and pending_sug.decision     is null
               and pending_sug.suggested_by is not null
  left join  public.profiles         s    on s.id = pending_sug.suggested_by
  where
    lk.recipient_id  = viewer_id
    and lk.decision  = 'approved'
    -- liker must still be available
    and dp.is_active      = true
    and dp.dating_status  = 'open'
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

-- get_likes_you_count
-- Returns the count of people who have liked the viewer and are still
-- actionable (liker active, no decision yet, no match yet).
-- Keeps the same filters as get_likes_you_pool for consistency.
create function public.get_likes_you_count(
  viewer_id uuid
)
returns bigint
language sql security definer stable as $$
  select count(*)
  from       public.decisions        lk
  join       public.dating_profiles  dp on dp.user_id = lk.actor_id
  where
    lk.recipient_id = viewer_id
    and lk.decision = 'approved'
    and dp.is_active     = true
    and dp.dating_status = 'open'
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
