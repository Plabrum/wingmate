-- ============================================================
-- Recreate trigger functions with hardcoded prod URL.
-- SUPABASE_URL is public — no secrets required on the DB side.
-- ============================================================

create or replace function public.notify_new_match()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://npslyvvynrvkcrvjewxb.supabase.co/functions/v1/notify-match',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type', 'INSERT', 'table', 'matches', 'schema', 'public',
      'record', jsonb_build_object('user_a_id', NEW.user_a_id, 'user_b_id', NEW.user_b_id),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://npslyvvynrvkcrvjewxb.supabase.co/functions/v1/notify-message',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type', 'INSERT', 'table', 'messages', 'schema', 'public',
      'record', jsonb_build_object('match_id', NEW.match_id, 'sender_id', NEW.sender_id, 'body', NEW.body),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create or replace function public.notify_wing_invite()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://npslyvvynrvkcrvjewxb.supabase.co/functions/v1/notify-invite',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type', 'INSERT', 'table', 'contacts', 'schema', 'public',
      'record', jsonb_build_object('winger_id', NEW.winger_id),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create or replace function public.notify_wing_suggestion()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://npslyvvynrvkcrvjewxb.supabase.co/functions/v1/notify-suggestion',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type', 'INSERT', 'table', 'decisions', 'schema', 'public',
      'record', jsonb_build_object('actor_id', NEW.actor_id, 'suggested_by', NEW.suggested_by),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

create or replace function public.notify_photo_suggestion()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://npslyvvynrvkcrvjewxb.supabase.co/functions/v1/notify-photo',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := jsonb_build_object(
      'type', 'INSERT', 'table', 'profile_photos', 'schema', 'public',
      'record', jsonb_build_object('dating_profile_id', NEW.dating_profile_id, 'suggester_id', NEW.suggester_id),
      'old_record', null
    )
  );
  return NEW;
end;
$$;
