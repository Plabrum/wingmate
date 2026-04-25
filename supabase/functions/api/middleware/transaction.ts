import { createMiddleware } from 'hono/factory';
import { db } from '../db/client.ts';
import type { Tx } from '../db/client.ts';

export type DbVars = { db: Tx };

// Request-scoped transaction middleware. Opens a Drizzle transaction, exposes
// it to the request via `c.var.db`, and lets Hono's error propagation drive
// commit vs. rollback:
//   • Normal return (incl. `c.json({error}, 400)`) → callback resolves → commit.
//   • Any thrown error (incl. `HTTPException`) → `await next()` re-throws →
//     Drizzle rolls back and rethrows → `app.onError` responds.
// Never import the module-level `db` from `db/client.ts` in handlers or query
// helpers — doing so bypasses this transaction and silently defeats rollback.
export const transactionMiddleware = createMiddleware<{ Variables: DbVars }>(
  async (c, next) => {
    await db.transaction(async (tx) => {
      c.set('db', tx);
      await next();
    });
  },
);
