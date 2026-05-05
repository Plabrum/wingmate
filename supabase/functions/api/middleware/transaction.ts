import { createMiddleware } from 'hono/factory';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import type { Tx } from '../db/client.ts';
import type { AuthVars } from './auth.ts';

export type DbVars = { db: Tx };

// Request-scoped transaction middleware. Opens a Drizzle transaction, switches
// the role to `authenticated` and binds the JWT claims so Supabase's
// `auth.uid()` resolves to the caller, exposes the tx to the request via
// `c.var.db`, and lets Hono's error propagation drive commit vs. rollback:
//   • Normal return (incl. `c.json({error}, 400)`) → callback resolves → commit.
//   • Any thrown error (incl. `HTTPException`) → `await next()` re-throws →
//     Drizzle rolls back and rethrows → `app.onError` responds.
// Never import the module-level `db` from `db/client.ts` in handlers or query
// helpers — doing so connects as `authenticator` (no claims, RLS empty-set) and
// silently bypasses both the transaction and the user's authorization context.
// `set_config(..., true)` is the function form of `SET LOCAL` — used because
// Drizzle parameterizes the value cleanly; `SET LOCAL request.jwt.claims = ...`
// does not accept a parameterized value.
// Idempotent: if a previous matching middleware already opened the request
// transaction, skip. Hono fires every registered middleware whose path matches
// — overlapping `app.use` patterns (e.g. `/foo/me` and `/foo/:id`) would
// otherwise call `db.transaction` twice nested. With `max: 1` on the pool the
// second call deadlocks waiting for a connection the first holds.
export const transactionMiddleware = createMiddleware<{
  Variables: AuthVars & DbVars;
}>(async (c, next) => {
  if (c.get('db')) {
    return next();
  }
  const claims = c.get('claims');
  const t0 = performance.now();
  await db.transaction(async (tx) => {
    const t1 = performance.now();
    await tx.execute(
      sql`select set_config('role', 'authenticated', true), set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    );
    const t2 = performance.now();
    c.set('db', tx);
    await next();
    const t3 = performance.now();
    console.log(
      `[timing] ${c.req.method} ${c.req.path} | conn=${Math.round(t1 - t0)}ms set_config=${Math.round(t2 - t1)}ms handler=${Math.round(t3 - t2)}ms total=${Math.round(t3 - t0)}ms`,
    );
  });
});
