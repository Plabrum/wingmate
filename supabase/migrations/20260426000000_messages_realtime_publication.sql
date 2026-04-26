-- Add the `messages` table to the supabase_realtime publication so that
-- postgres_changes subscriptions on the chat screen receive INSERT events
-- for newly delivered messages. Without this, opening a chat does not see
-- new rows until the screen is remounted (the initial HTTP fetch re-runs).
--
-- Wrapped in DO block so re-runs are idempotent — Postgres has no
-- "ALTER PUBLICATION ... ADD TABLE IF NOT EXISTS" form.

do $$
begin
  if not exists (
    select 1
    from   pg_publication_tables
    where  pubname    = 'supabase_realtime'
      and  schemaname = 'public'
      and  tablename  = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
