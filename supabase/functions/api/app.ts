import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { authMiddleware } from './middleware/auth.ts';
import { pushMiddleware } from './middleware/push.ts';
import { transactionMiddleware } from './middleware/transaction.ts';
import { errorHandler } from './middleware/error.ts';
import { mountContacts } from './domains/contacts/route.ts';
import { mountDecisions } from './domains/decisions/route.ts';
import { mountDiscover } from './domains/discover/route.ts';
import { mountLikesYou } from './domains/likes-you/route.ts';
import { mountMatches } from './domains/matches/route.ts';
import { mountMessages } from './domains/messages/route.ts';
import { mountPhotos } from './domains/photos/route.ts';
import { mountProfiles } from './domains/profiles/route.ts';
import { mountPrompts } from './domains/prompts/route.ts';
import { mountWingerActivity } from './domains/winger-activity/route.ts';
import { mountWingerTabs } from './domains/winger-tabs/route.ts';
import { mountWingPool } from './domains/wing-pool/route.ts';
import type { AppEnv } from './types.ts';

export function createApp() {
  const app = new OpenAPIHono<AppEnv>().basePath('/api');

  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: { title: 'Pear API', version: '1.0.0' },
  });

  app.get('/doc', swaggerUI({ url: '/api/openapi.json' }));

  // Auth → push client → per-request transaction for every protected route.
  // Doc routes above are registered first so they skip all three — they don't
  // touch the DB and Kong doesn't gate them in prod.
  //
  // All middlewares are idempotent (no-op if already applied to this request),
  // so overlapping path patterns inside individual routes can't accidentally
  // double-open a transaction and deadlock the max:1 pool.
  app.use('/*', authMiddleware);
  app.use('/*', pushMiddleware);
  app.use('/*', transactionMiddleware);

  mountDiscover(app);
  mountLikesYou(app);
  mountWingerTabs(app);
  mountWingerActivity(app);
  mountWingPool(app);
  mountDecisions(app);
  mountProfiles(app);
  mountMatches(app);
  mountMessages(app);
  mountPhotos(app);
  mountPrompts(app);
  mountContacts(app);

  app.onError(errorHandler);

  return app;
}
