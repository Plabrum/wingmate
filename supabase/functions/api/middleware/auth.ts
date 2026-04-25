import { createMiddleware } from 'hono/factory';
import { createLocalJWKSet, jwtVerify, type JWK, type JWTVerifyGetKey } from 'jose';

// Supabase CLI ≥ 2.74 (and Supabase projects on the new asymmetric scheme) issue ES256 JWTs
// and publish the JWKS via JWT_KEYS (a JSON array of JWKs). Legacy deployments still use
// HS256 with a shared JWT_SECRET. Support both via the JWTVerifyGetKey shape.
const keysEnv = Deno.env.get('JWT_KEYS');
const hmacSecret = new TextEncoder().encode(Deno.env.get('JWT_SECRET') ?? '');
const verifier: JWTVerifyGetKey = keysEnv
  ? createLocalJWKSet({ keys: JSON.parse(keysEnv) as JWK[] })
  : () => hmacSecret;

export type AuthVars = {
  userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }

  const { payload } = await jwtVerify(token, verifier);
  const sub = payload.sub;
  if (!sub) {
    return c.json({ error: 'Invalid token: missing sub' }, 401);
  }

  c.set('userId', sub);
  await next();
});
