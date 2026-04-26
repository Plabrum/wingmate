import type { AuthVars } from './middleware/auth.ts';
import type { PushVars } from './middleware/push.ts';
import type { SupabaseVars } from './middleware/supabase.ts';
import type { DbVars } from './middleware/transaction.ts';

// Shared Hono env for every protected route on the `api` function.
// Kept in its own file to avoid an `app.ts → routes → app.ts` import cycle.
export type AppVars = AuthVars & SupabaseVars & PushVars & DbVars;
export type AppEnv = { Variables: AppVars };
