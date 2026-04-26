-- ============================================================
-- Drop the pg_net push triggers — push delivery now lives inline
-- in the Hono `api` function (api/lib/push.ts), called after each
-- Drizzle write. The trigger path is no longer needed.
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

alter database postgres reset "app.supabase_url";
alter database postgres reset "app.service_role_key";
