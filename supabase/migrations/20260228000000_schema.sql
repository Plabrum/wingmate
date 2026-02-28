-- ============================================================
-- Migration: full app schema
-- Builds on 20260227000000_init.sql (profiles table + auth trigger)
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================

create type public.gender as enum ('Male', 'Female', 'Non-Binary');

create type public.religion as enum (
  'Muslim',
  'Christian',
  'Jewish',
  'Hindu',
  'Buddhist',
  'Sikh',
  'Agnostic',
  'Atheist',
  'Other',
  'Prefer not to say'
);

create type public.interest as enum (
  'Travel',
  'Fitness',
  'Cooking',
  'Music',
  'Art',
  'Movies',
  'Books',
  'Gaming',
  'Outdoors',
  'Sports',
  'Technology',
  'Fashion',
  'Food',
  'Photography',
  'Dance',
  'Volunteering'
);

-- Expand as rollout grows; use ALTER TYPE ... ADD VALUE to add new cities
create type public.city as enum (
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow'
);

create type public.wingperson_status as enum ('invited', 'active', 'removed');

create type public.decision_type as enum ('approved', 'declined');

-- Role chosen at signup: 'dater' creates a dating profile; 'winger' supports others only
create type public.user_role as enum ('dater', 'winger');

-- Changeable status shown on the dater's profile
create type public.dating_status as enum ('open', 'break', 'winging');

-- ============================================================
-- 2. Extend profiles (existing prod table) with user fields
-- ============================================================

alter table public.profiles
  add column chosen_name   text,
  add column last_name     text,
  add column phone_number  text,
  add column date_of_birth date,
  add column gender        public.gender,                          -- nullable; used by discover filter
  add column role          public.user_role not null default 'dater',
  add column push_token    text,                                   -- Expo push token; set after permission granted
  add column created_at    timestamptz not null default now();

-- ============================================================
-- 3. dating_profiles
-- ============================================================

create table public.dating_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles (id) on delete cascade,
  bio                 text,
  interested_gender   public.gender[]   not null default '{}',
  age_from            int               not null,
  age_to              int,
  religion            public.religion   not null,
  religious_preference public.religion,
  interests           public.interest[] not null default '{}',
  city                public.city          not null,
  is_active           bool                 not null default true,
  dating_status       public.dating_status not null default 'open',
  created_at          timestamptz          not null default now(),
  updated_at          timestamptz          not null default now()
);

-- auto-update updated_at
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_dating_profiles_updated_at
  before update on public.dating_profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 4. profile_photos
-- ============================================================

create table public.profile_photos (
  id                 uuid        primary key default gen_random_uuid(),
  dating_profile_id  uuid        not null references public.dating_profiles (id) on delete cascade,
  suggester_id       uuid        references public.profiles (id) on delete set null, -- null = self-uploaded
  storage_url        text        not null,
  display_order      int         not null,
  approved_at        timestamptz,                                                     -- null = pending approval
  created_at         timestamptz not null default now()
);

-- ============================================================
-- 5. prompt_templates  (admin-managed, read-only for users)
-- ============================================================

create table public.prompt_templates (
  id       uuid primary key default gen_random_uuid(),
  question text not null
);

-- ============================================================
-- 6. profile_prompts
-- ============================================================

create table public.profile_prompts (
  id                 uuid        primary key default gen_random_uuid(),
  dating_profile_id  uuid        not null references public.dating_profiles (id) on delete cascade,
  prompt_template_id uuid        not null references public.prompt_templates (id),
  answer             text        not null,
  created_at         timestamptz not null default now()
);

-- ============================================================
-- 7. prompt_responses  (Hinge-style comments on a prompt)
-- ============================================================

create table public.prompt_responses (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  profile_prompt_id uuid        not null references public.profile_prompts (id) on delete cascade,
  message           text        not null,
  is_approved       bool        not null default false,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- 8. contacts  (wingperson address book)
-- ============================================================

-- contacts: dater → winger relationship.
--   user_id      = the dater (who wants a wingperson)
--   phone_number = phone used to send the invite SMS
--   winger_id    = set once the invitee creates an account and accepts
-- Queries by direction:
--   "My wingpeople"    → user_id = me, status = active
--   "You're winging for" → winger_id = me, status = active
--   "Pending invites"  → winger_id = me, status = invited
create table public.contacts (
  id                uuid                    primary key default gen_random_uuid(),
  user_id           uuid                    not null references public.profiles (id) on delete cascade,
  phone_number      text                    not null,
  winger_id         uuid                    references public.profiles (id) on delete set null,
  wingperson_status public.wingperson_status not null default 'invited',
  created_at        timestamptz             not null default now()
);

-- ============================================================
-- 9. decisions  (swipes + wingperson suggestions)
-- ============================================================

create table public.decisions (
  id           uuid                  primary key default gen_random_uuid(),
  actor_id     uuid                  not null references public.profiles (id) on delete cascade,
  recipient_id uuid                  not null references public.profiles (id) on delete cascade,
  decision     public.decision_type,           -- null = wingperson suggestion not yet acted on
  suggested_by uuid                  references public.profiles (id) on delete set null,
  note         text,                           -- optional message from the wingperson shown in Discover
  created_at   timestamptz           not null default now(),
  constraint unique_actor_recipient unique (actor_id, recipient_id),
  constraint no_self_decision check (actor_id <> recipient_id)
);

-- ============================================================
-- 10. matches
-- Enforce user_a_id < user_b_id so the pair is always unique
-- regardless of insertion order; app must sort before inserting.
-- ============================================================

create table public.matches (
  id         uuid        primary key default gen_random_uuid(),
  user_a_id  uuid        not null references public.profiles (id) on delete cascade,
  user_b_id  uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_match      unique (user_a_id, user_b_id),
  constraint ordered_match_ids check  (user_a_id < user_b_id)
);

-- ============================================================
-- 11. messages
-- ============================================================

create table public.messages (
  id         uuid        primary key default gen_random_uuid(),
  match_id   uuid        not null references public.matches (id) on delete cascade,
  sender_id  uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null,
  is_read    bool        not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 12. Indexes
-- ============================================================

create index on public.dating_profiles (is_active, city);
create index on public.dating_profiles (user_id);

create index on public.profile_photos (dating_profile_id, display_order);
create index on public.profile_photos (suggester_id) where suggester_id is not null;

create index on public.profile_prompts (dating_profile_id);
create index on public.profile_prompts (prompt_template_id);

create index on public.prompt_responses (profile_prompt_id);
create index on public.prompt_responses (user_id);

create index on public.contacts (user_id);
create index on public.contacts (winger_id) where winger_id is not null;

create index on public.decisions (actor_id);
create index on public.decisions (recipient_id);
create index on public.decisions (suggested_by) where suggested_by is not null;

create index on public.matches (user_a_id);
create index on public.matches (user_b_id);

create index on public.messages (match_id, created_at);
create index on public.messages (sender_id);

-- ============================================================
-- 13. Row-Level Security
-- ============================================================

alter table public.dating_profiles  enable row level security;
alter table public.profile_photos   enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.profile_prompts  enable row level security;
alter table public.prompt_responses enable row level security;
alter table public.contacts         enable row level security;
alter table public.decisions        enable row level security;
alter table public.matches          enable row level security;
alter table public.messages         enable row level security;

-- dating_profiles -------------------------------------------
create policy "Active profiles viewable by authenticated users"
  on public.dating_profiles for select to authenticated
  using (is_active = true or user_id = auth.uid());

create policy "Users can insert their own dating profile"
  on public.dating_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own dating profile"
  on public.dating_profiles for update to authenticated
  using (user_id = auth.uid());

create policy "Users can delete their own dating profile"
  on public.dating_profiles for delete to authenticated
  using (user_id = auth.uid());

-- profile_photos --------------------------------------------
-- Reuse a helper to avoid repeated subqueries
-- Approved photos are visible to all authenticated users (when profile is active).
-- Unapproved photos are visible only to the profile owner and the suggester.
create policy "Photos viewable when approved or own/suggested"
  on public.profile_photos for select to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_photos.dating_profile_id
        and (
          -- profile owner always sees all their photos
          dp.user_id = auth.uid()
          -- suggester can see the photo they suggested
          or profile_photos.suggester_id = auth.uid()
          -- everyone else only sees approved photos on active profiles
          or (dp.is_active = true and profile_photos.approved_at is not null)
        )
    )
  );

create policy "Users can insert photos for their own profile"
  on public.profile_photos for insert to authenticated
  with check (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_photos.dating_profile_id
        and dp.user_id = auth.uid()
    )
  );

create policy "Users can update photos for their own profile"
  on public.profile_photos for update to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_photos.dating_profile_id
        and dp.user_id = auth.uid()
    )
  );

create policy "Users can delete photos for their own profile"
  on public.profile_photos for delete to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_photos.dating_profile_id
        and dp.user_id = auth.uid()
    )
  );

-- prompt_templates ------------------------------------------
create policy "Prompt templates readable by authenticated users"
  on public.prompt_templates for select to authenticated
  using (true);

-- profile_prompts -------------------------------------------
create policy "Profile prompts viewable when profile is active or own"
  on public.profile_prompts for select to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_prompts.dating_profile_id
        and (dp.is_active = true or dp.user_id = auth.uid())
    )
  );

create policy "Users can insert prompts for their own profile"
  on public.profile_prompts for insert to authenticated
  with check (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_prompts.dating_profile_id
        and dp.user_id = auth.uid()
    )
  );

create policy "Users can update prompts for their own profile"
  on public.profile_prompts for update to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_prompts.dating_profile_id
        and dp.user_id = auth.uid()
    )
  );

create policy "Users can delete prompts for their own profile"
  on public.profile_prompts for delete to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_prompts.dating_profile_id
        and dp.user_id = auth.uid()
    )
  );

-- prompt_responses ------------------------------------------
-- Visible to: the sender, or the dating profile owner
create policy "Users can view relevant prompt responses"
  on public.prompt_responses for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profile_prompts pp
      join public.dating_profiles dp on dp.id = pp.dating_profile_id
      where pp.id = prompt_responses.profile_prompt_id
        and dp.user_id = auth.uid()
    )
  );

create policy "Authenticated users can send prompt responses"
  on public.prompt_responses for insert to authenticated
  with check (user_id = auth.uid());

-- Only the profile owner can approve/reject a response
create policy "Profile owners can update prompt responses"
  on public.prompt_responses for update to authenticated
  using (
    exists (
      select 1
      from public.profile_prompts pp
      join public.dating_profiles dp on dp.id = pp.dating_profile_id
      where pp.id = prompt_responses.profile_prompt_id
        and dp.user_id = auth.uid()
    )
  );

-- contacts --------------------------------------------------
-- Daters see their own rows; wingers see rows where they are the winger
-- (needed for "You're Winging For" and "Pending Invitations" views)
create policy "Users can view contacts they are party to"
  on public.contacts for select to authenticated
  using (user_id = auth.uid() or winger_id = auth.uid());

-- Only the dater creates the initial contact/invite row
create policy "Users can insert their own contacts"
  on public.contacts for insert to authenticated
  with check (user_id = auth.uid());

-- Both the dater (managing their roster) and the winger (accepting/declining)
-- need to update the row
create policy "Users can update contacts they are party to"
  on public.contacts for update to authenticated
  using (user_id = auth.uid() or winger_id = auth.uid());

create policy "Users can delete their own contacts"
  on public.contacts for delete to authenticated
  using (user_id = auth.uid());

-- decisions -------------------------------------------------
-- Visible to actor, recipient, or the wingperson who suggested it
create policy "Users can view decisions they are party to"
  on public.decisions for select to authenticated
  using (
    actor_id     = auth.uid()
    or recipient_id = auth.uid()
    or suggested_by = auth.uid()
  );

-- Direct swipe: actor inserts their own row.
-- Wingperson suggestion: winger inserts a row on the dater's behalf, so
-- actor_id ≠ auth.uid(). Allow when suggested_by = auth.uid() AND the
-- dater has an active wing relationship with this user.
create policy "Users can insert decisions as actor or wingperson"
  on public.decisions for insert to authenticated
  with check (
    -- normal self-swipe
    actor_id = auth.uid()
    -- wingperson suggesting on behalf of a dater they are actively winging for
    or (
      suggested_by = auth.uid()
      and exists (
        select 1 from public.contacts c
        where c.user_id    = decisions.actor_id
          and c.winger_id  = auth.uid()
          and c.wingperson_status = 'active'
      )
    )
  );

-- Actors update their own decisions (e.g. acting on a wingperson suggestion)
create policy "Actors can update their own decisions"
  on public.decisions for update to authenticated
  using (actor_id = auth.uid());

-- matches ---------------------------------------------------
create policy "Users can view their own matches"
  on public.matches for select to authenticated
  using (user_a_id = auth.uid() or user_b_id = auth.uid());

-- Matches are created by server-side logic only (no direct user insert)
-- If needed, grant insert via a service role or a security definer function.

-- messages --------------------------------------------------
create policy "Users can view messages in their matches"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    )
  );

create policy "Users can send messages in their matches"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    )
  );

create policy "Senders can mark their own messages read"
  on public.messages for update to authenticated
  using (sender_id = auth.uid());

-- ============================================================
-- 14. Storage buckets  (content below, after sections 15–16)
-- ============================================================

-- ============================================================
-- 15. DB triggers
-- ============================================================

-- 15a. Auto-create a Match when two decisions are mutually 'approved'.
--      Fires on INSERT (direct like) and on UPDATE (acting on a suggestion).
--      Enforces user_a_id < user_b_id so the unique constraint is satisfied
--      regardless of which direction fires first.
create function public.create_match_if_mutual()
returns trigger language plpgsql security definer as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if new.decision is distinct from 'approved' then
    return new;
  end if;

  if not exists (
    select 1 from public.decisions
    where  actor_id     = new.recipient_id
      and  recipient_id = new.actor_id
      and  decision     = 'approved'
  ) then
    return new;
  end if;

  v_a := least(new.actor_id, new.recipient_id);
  v_b := greatest(new.actor_id, new.recipient_id);

  insert into public.matches (user_a_id, user_b_id)
  values (v_a, v_b)
  on conflict (user_a_id, user_b_id) do nothing;

  return new;
end;
$$;

create trigger trg_create_match
  after insert or update of decision on public.decisions
  for each row execute procedure public.create_match_if_mutual();

-- 15b. When a profile's phone_number is first set, look for any pending
--      contact invitations addressed to that number and link them.
--      This handles the flow: dater invites by phone → invitee signs up →
--      winger_id is automatically filled in, invitation becomes visible.
create function public.auto_link_pending_contacts()
returns trigger language plpgsql security definer as $$
begin
  update public.contacts
  set    winger_id = new.id
  where  phone_number      = new.phone_number
    and  winger_id         is null
    and  wingperson_status = 'invited';

  return new;
end;
$$;

-- Only fires when phone_number transitions from null → a value (first set).
create trigger trg_auto_link_winger
  after update of phone_number on public.profiles
  for each row
  when (old.phone_number is null and new.phone_number is not null)
  execute procedure public.auto_link_pending_contacts();

-- ============================================================
-- 16. RPC functions
-- ============================================================

-- 16a. get_discover_pool
-- Returns the paginated card feed for the Discover screen.
-- filter_winger_id: when set, restricts to pending suggestions from that winger.
-- page_size / page_offset: for pagination as the user swipes through.
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

-- 16b. get_wing_pool
-- Returns the browsable pool for a wingperson swiping on behalf of a dater.
-- Uses the dater's preferences and excludes profiles the dater already decided on.
-- Also verifies the winger has an active relationship with the dater.
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

-- profile-photos: public bucket (approved photos served via CDN).
-- Files are stored at {uploader_user_id}/{filename} so ownership
-- is enforced purely by the folder prefix matching auth.uid().
-- This covers both self-uploads and wingperson suggestions —
-- the suggester uploads to their own folder; the DB row in
-- profile_photos links the file to the target dating profile.
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', true);

-- SELECT: bucket is public so any client (anon included) can read.
create policy "Profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

-- INSERT: authenticated users can only upload into their own folder.
create policy "Users can upload to their own photo folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: allow in-place replacement within own folder (e.g. re-upload).
create policy "Users can update files in their own photo folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: users can remove files they own; app must also delete the
-- profile_photos DB row (storage deletes do not cascade to the DB).
create policy "Users can delete files in their own photo folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── avatars bucket (created in init.sql) ────────────────────────────────────
-- The original "Anyone can upload an avatar" policy is too permissive.
-- Replace it with a policy scoped to the authenticated user's own folder.
drop policy if exists "Anyone can upload an avatar." on storage.objects;

create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
