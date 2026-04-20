import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(Deno.env.get('JWT_SECRET') ?? '');

export type AuthVars = {
  userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }

  const { payload } = await jwtVerify(token, secret);
  const sub = payload.sub;
  if (!sub) {
    return c.json({ error: 'Invalid token: missing sub' }, 401);
  }

  c.set('userId', sub);
  await next();
});
