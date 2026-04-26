import { createMiddleware } from 'hono/factory';
import { config } from '../lib/config.ts';
import { createPushClient, type PushClient } from '../lib/push.ts';

export type PushVars = { push: PushClient };

// Singleton push client — stateless, doesn't depend on the request, safe to
// share across all isolates. Built once at module load using the same
// `config.isProd` signal that decides whether to actually deliver.
const pushClient = createPushClient({ isProd: config.isProd });

export const pushMiddleware = createMiddleware<{ Variables: PushVars }>(async (c, next) => {
  if (c.get('push')) {
    return next();
  }
  c.set('push', pushClient);
  await next();
});
