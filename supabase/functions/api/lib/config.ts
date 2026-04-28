function required(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}

// SUPABASE_REGION is auto-injected on hosted Supabase; absent in the local
// dev stack. It's the sole signal for `isProd` — no operator-set flag.
export const config = {
  databaseUrl: required('SUPABASE_DB_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  isProd: !!Deno.env.get('SUPABASE_REGION'),
} as const;
