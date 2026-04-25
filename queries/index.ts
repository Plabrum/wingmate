// TRANSITIONAL: this directory wraps Supabase RPCs and PostgREST selects for pre-migration
// endpoints. New endpoints go on the `api` edge function (supabase/functions/api/routes/) and
// reach the client via Orval-generated hooks in `lib/api/generated/`. Do not add new files here.
// Each file shrinks as its underlying RPCs port; the directory should eventually be empty.

export * from './contacts';
export * from './discover';
export * from './messages';
export * from './photos';
export * from './prompts';
