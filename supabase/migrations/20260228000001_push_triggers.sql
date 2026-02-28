-- ============================================================
-- Migration: push notification triggers via pg_net
-- Each trigger fires AFTER INSERT and calls a Deno Edge Function.
-- app.supabase_url and app.service_role_key must be set as
-- Postgres settings in the Supabase dashboard:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
-- ============================================================

-- ── 1. New match ─────────────────────────────────────────────────────────────

create or replace function public.notify_new_match()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/notify-match',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object('user_a_id', NEW.user_a_id, 'user_b_id', NEW.user_b_id)
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
begin
  perform net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/notify-message',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object(
      'match_id',  NEW.match_id,
      'sender_id', NEW.sender_id,
      'body',      NEW.body
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
begin
  perform net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/notify-invite',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object('winger_id', NEW.winger_id)
  );
  return NEW;
end;
$$;

create trigger trg_notify_wing_invite
  after insert on public.contacts
  for each row execute procedure public.notify_wing_invite();

-- ── 4. Wing suggestion ───────────────────────────────────────────────────────

create or replace function public.notify_wing_suggestion()
returns trigger language plpgsql security definer as $$
begin
  if NEW.suggested_by is not null then
    perform net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-suggestion',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := jsonb_build_object(
        'actor_id',     NEW.actor_id,
        'suggested_by', NEW.suggested_by
      )
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_notify_wing_suggestion
  after insert on public.decisions
  for each row execute procedure public.notify_wing_suggestion();

-- ── 5. Photo suggestion ──────────────────────────────────────────────────────

create or replace function public.notify_photo_suggestion()
returns trigger language plpgsql security definer as $$
begin
  if NEW.suggester_id is not null then
    perform net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-photo',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := jsonb_build_object(
        'dating_profile_id', NEW.dating_profile_id,
        'suggester_id',      NEW.suggester_id
      )
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_notify_photo_suggestion
  after insert on public.profile_photos
  for each row execute procedure public.notify_photo_suggestion();
