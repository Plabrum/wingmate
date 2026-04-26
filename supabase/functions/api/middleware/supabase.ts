import { createMiddleware } from 'hono/factory';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { config } from '../lib/config.ts';
import type { AuthVars } from './auth.ts';

export type SupabaseVars = { supabase: SupabaseClient };

// Per-request supabase-js client carrying the caller's JWT. Mirrors `c.var.db`
// for non-Drizzle Supabase surfaces (Storage, edge invokes, auth admin) — RLS
// on those endpoints sees `auth.uid()` because the bearer token is forwarded.
// Idempotent: skip if a previous matching middleware already attached a client.
export const supabaseMiddleware = createMiddleware<{
  Variables: AuthVars & SupabaseVars;
}>(async (c, next) => {
  if (c.get('supabase')) {
    return next();
  }
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${c.get('token')}` } },
  });
  c.set('supabase', client);
  await next();
});
