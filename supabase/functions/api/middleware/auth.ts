import { createMiddleware } from 'hono/factory';

// Kong (Supabase API gateway) verifies the JWT signature, expiry, and audience
// before any request reaches this function in prod. Locally we run with
// --no-verify-jwt and trust the dev stack. So this middleware just extracts
// claims from the already-trusted token and stashes them for the transaction
// middleware (which sets `request.jwt.claims` for RLS) and the storage helper
// (which forwards the raw bearer to the Storage REST API).

export type AuthVars = {
  userId: string;
  token: string;
  claims: Record<string, unknown>;
};

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split('.')[1] ?? '';
  const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

// Idempotent: if a previous matching middleware already set userId on this
// request, skip. Hono fires every registered middleware whose path matches —
// overlapping `app.use` patterns (e.g. `/foo/me` and `/foo/:id`) would otherwise
// run this twice for the same request.
export const authMiddleware = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  if (c.get('userId')) {
    return next();
  }

  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }

  let claims: Record<string, unknown>;
  try {
    claims = decodeJwtPayload(token);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
  const sub = typeof claims.sub === 'string' ? claims.sub : undefined;
  if (!sub) {
    return c.json({ error: 'Invalid token: missing sub' }, 401);
  }

  c.set('userId', sub);
  c.set('token', token);
  c.set('claims', claims);
  await next();
});
