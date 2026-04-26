-- ============================================================
-- Migration: authenticator → authenticated bridge
-- The api function (`supabase/functions/api/`) now connects as the
-- `authenticator` role and runs each request transaction as `authenticated`
-- (with `request.jwt.claims` set), so RLS becomes the actual authorization
-- floor instead of being bypassed by the superuser connection.
--
-- Supabase's hosted/local stacks already wire these grants up; the statements
-- below are idempotent and exist so a fresh stack is reproducible from
-- migrations alone. Repeated GRANTs are no-ops in Postgres.
-- ============================================================

-- 1. Let authenticator switch into authenticated for the request.
grant authenticated to authenticator;

-- 2. Schema usage on public for the role that runs requests.
grant usage on schema public to authenticated;

-- 3. CRUD on existing public tables. RLS still applies; these grants are the
--    ceiling, RLS is the floor.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- 4. Sequences for serial/identity columns and gen_random_uuid()-fed defaults.
grant usage, select on all sequences in schema public to authenticated;

-- 5. Make the same grants apply to objects created by future migrations
--    without revisiting this file. `for role postgres` because the migration
--    runner connects as postgres and that's the role that will own new tables.
alter default privileges in schema public for role postgres
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public for role postgres
  grant usage, select on sequences to authenticated;
alter default privileges in schema public for role postgres
  grant execute on functions to authenticated;
