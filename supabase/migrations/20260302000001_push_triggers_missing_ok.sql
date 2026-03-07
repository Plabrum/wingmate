-- ============================================================
-- Fix: use current_setting(..., true) so triggers don't error
-- when app.supabase_url / app.service_role_key are not set
-- (e.g. local dev). The HTTP call is skipped when either is null.
-- ============================================================

create or replace function public.notify_new_match()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  if _url is not null and _key is not null then
    perform net.http_post(
      url     := _url || '/functions/v1/notify-match',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body    := jsonb_build_object('user_a_id', NEW.user_a_id, 'user_b_id', NEW.user_b_id)
    );
  end if;
  return NEW;
end;
$$;

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  if _url is not null and _key is not null then
    perform net.http_post(
      url     := _url || '/functions/v1/notify-message',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body    := jsonb_build_object(
        'match_id',  NEW.match_id,
        'sender_id', NEW.sender_id,
        'body',      NEW.body
      )
    );
  end if;
  return NEW;
end;
$$;

create or replace function public.notify_wing_invite()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  if _url is not null and _key is not null then
    perform net.http_post(
      url     := _url || '/functions/v1/notify-invite',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body    := jsonb_build_object('winger_id', NEW.winger_id)
    );
  end if;
  return NEW;
end;
$$;

create or replace function public.notify_wing_suggestion()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  if NEW.suggested_by is not null and _url is not null and _key is not null then
    perform net.http_post(
      url     := _url || '/functions/v1/notify-suggestion',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _key
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

create or replace function public.notify_photo_suggestion()
returns trigger language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  if NEW.suggester_id is not null and _url is not null and _key is not null then
    perform net.http_post(
      url     := _url || '/functions/v1/notify-photo',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _key
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
