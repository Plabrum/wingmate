import type { Context } from 'hono';
import type { AppEnv } from '../types.ts';

// Pulls every per-request value off c.var into one destructurable object.
// Replaces N `const x = c.get('x')` lines with `const { x, y } = getDeps(c)`.
// Types flow from AppEnv → Variables; adding a new middleware Var is one line.
export function getDeps(c: Context<AppEnv>) {
  return {
    userId: c.get('userId'),
    token: c.get('token'),
    claims: c.get('claims'),
    db: c.get('db'),
    supabase: c.get('supabase'),
    push: c.get('push'),
  };
}
