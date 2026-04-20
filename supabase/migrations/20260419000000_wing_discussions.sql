-- Wing Discussions: per-suggestion chat threads between dater and winger.
-- Also adds decision_id to get_discover_pool so the client can open/create
-- a discussion thread from the discover card.

-- ── 1. Tables ──────────────────────────────────────────────────────────────────

create table public.wing_discussions (
  id                   uuid primary key default gen_random_uuid(),
  decision_id          uuid not null unique references public.decisions(id) on delete cascade,
  dater_id             uuid not null references public.profiles(id),
  winger_id            uuid not null references public.profiles(id),
  suggested_profile_id uuid not null references public.profiles(id),
  created_at           timestamptz not null default now()
);

create table public.wing_discussion_messages (
  id            uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.wing_discussions(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id),
  body          text not null,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── 2. RLS ─────────────────────────────────────────────────────────────────────

alter table public.wing_discussions enable row level security;
alter table public.wing_discussion_messages enable row level security;

create policy "participants can read discussions"
  on public.wing_discussions for select
  using (auth.uid() = dater_id or auth.uid() = winger_id);

create policy "participants can insert discussions"
  on public.wing_discussions for insert
  with check (auth.uid() = dater_id or auth.uid() = winger_id);

create policy "participants can read messages"
  on public.wing_discussion_messages for select
  using (
    exists (
      select 1 from public.wing_discussions d
      where d.id = discussion_id
        and (d.dater_id = auth.uid() or d.winger_id = auth.uid())
    )
  );

create policy "participants can insert messages"
  on public.wing_discussion_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.wing_discussions d
      where d.id = discussion_id
        and (d.dater_id = auth.uid() or d.winger_id = auth.uid())
    )
  );

create policy "participants can update own messages"
  on public.wing_discussion_messages for update
  using (
    exists (
      select 1 from public.wing_discussions d
      where d.id = discussion_id
        and (d.dater_id = auth.uid() or d.winger_id = auth.uid())
    )
  );

-- ── 3. Push-notification trigger ───────────────────────────────────────────────

create or replace function public.notify_wing_discussion_message()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
begin
  if _url is null then return new; end if;
  perform net.http_post(
    url     := _url || '/functions/v1/notify-wing-discussion',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'wing_discussion_messages',
      'schema',     'public',
      'record',     row_to_json(new),
      'old_record', null
    )
  );
  return new;
end;
$$;

create trigger on_wing_discussion_message_insert
  after insert on public.wing_discussion_messages
  for each row execute procedure public.notify_wing_discussion_message();

-- ── 4. Add decision_id to get_discover_pool ────────────────────────────────────

drop function if exists public.get_discover_pool(uuid, uuid, int, int, boolean);

create function public.get_discover_pool(
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
  suggester_name text,
  decision_id    uuid
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
    s.chosen_name                                                 as suggester_name,
    d.id                                                          as decision_id
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
    and (
      filter_winger_id is null
      or (d.suggested_by = filter_winger_id and d.decision is null)
    )
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
