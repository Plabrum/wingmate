-- ============================================================
-- Migration: replace push trigger functions with WebhookPayload format
-- Drops app.service_role_key dependency — Edge Functions use verify_jwt = false
-- Only app.supabase_url is required; triggers skip silently when unset (local dev)
-- ============================================================

drop trigger if exists trg_notify_new_match        on public.matches;
drop trigger if exists trg_notify_new_message      on public.messages;
drop trigger if exists trg_notify_wing_invite      on public.contacts;
drop trigger if exists trg_notify_wing_suggestion  on public.decisions;
drop trigger if exists trg_notify_photo_suggestion on public.profile_photos;

drop function if exists public.notify_new_match();
drop function if exists public.notify_new_message();
drop function if exists public.notify_wing_invite();
drop function if exists public.notify_wing_suggestion();
drop function if exists public.notify_photo_suggestion();

-- ── 1. New match ─────────────────────────────────────────────────────────────

create or replace function public.notify_new_match()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
begin
  if _url is null then return NEW; end if;
  perform net.http_post(
    url     := _url || '/functions/v1/notify-match',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'matches',
      'schema',     'public',
      'record',     jsonb_build_object('user_a_id', NEW.user_a_id, 'user_b_id', NEW.user_b_id),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger trg_notify_new_match
  after insert on public.matches
  for each row execute procedure public.notify_new_match();

-- ── 2. New message ───────────────────────────────────────────────────────────

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
begin
  if _url is null then return NEW; end if;
  perform net.http_post(
    url     := _url || '/functions/v1/notify-message',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'messages',
      'schema',     'public',
      'record',     jsonb_build_object('match_id', NEW.match_id, 'sender_id', NEW.sender_id, 'body', NEW.body),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

-- ── 3. Wing invite ───────────────────────────────────────────────────────────

create or replace function public.notify_wing_invite()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
begin
  if _url is null then return NEW; end if;
  perform net.http_post(
    url     := _url || '/functions/v1/notify-invite',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'contacts',
      'schema',     'public',
      'record',     jsonb_build_object('winger_id', NEW.winger_id),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger trg_notify_wing_invite
  after insert on public.contacts
  for each row execute procedure public.notify_wing_invite();

-- ── 4. Wing suggestion (WHEN clause replaces inline if guard) ─────────────────

create or replace function public.notify_wing_suggestion()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
begin
  if _url is null then return NEW; end if;
  perform net.http_post(
    url     := _url || '/functions/v1/notify-suggestion',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'decisions',
      'schema',     'public',
      'record',     jsonb_build_object('actor_id', NEW.actor_id, 'suggested_by', NEW.suggested_by),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger trg_notify_wing_suggestion
  after insert on public.decisions
  for each row
  when (NEW.suggested_by is not null)
  execute procedure public.notify_wing_suggestion();

-- ── 5. Photo suggestion (WHEN clause replaces inline if guard) ────────────────

create or replace function public.notify_photo_suggestion()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
begin
  if _url is null then return NEW; end if;
  perform net.http_post(
    url     := _url || '/functions/v1/notify-photo',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'profile_photos',
      'schema',     'public',
      'record',     jsonb_build_object('dating_profile_id', NEW.dating_profile_id, 'suggester_id', NEW.suggester_id),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create trigger trg_notify_photo_suggestion
  after insert on public.profile_photos
  for each row
  when (NEW.suggester_id is not null)
  execute procedure public.notify_photo_suggestion();
