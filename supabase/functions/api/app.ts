import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { authMiddleware } from './middleware/auth.ts';
import { transactionMiddleware } from './middleware/transaction.ts';
import { errorHandler } from './middleware/error.ts';
import { mountDecisions } from './domains/decisions/route.ts';
import { mountDiscover } from './domains/discover/route.ts';
import { mountLikesYou } from './domains/likes-you/route.ts';
import { mountMatches } from './domains/matches/route.ts';
import { mountProfiles } from './domains/profiles/route.ts';
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
    info: { title: 'Wyng API', version: '1.0.0' },
  });

  app.get('/doc', swaggerUI({ url: '/api/openapi.json' }));

  // Order matters: auth first so unauthenticated requests never open a
  // transaction or consume the pool slot. Doc routes above intentionally
  // skip both — they don't touch the DB.
  app.use('/discover', authMiddleware);
  app.use('/discover', transactionMiddleware);
  mountDiscover(app);

  app.use('/likes-you', authMiddleware);
  app.use('/likes-you', transactionMiddleware);
  app.use('/likes-you/count', authMiddleware);
  app.use('/likes-you/count', transactionMiddleware);
  mountLikesYou(app);

  app.use('/winger-tabs', authMiddleware);
  app.use('/winger-tabs', transactionMiddleware);
  mountWingerTabs(app);

  app.use('/wing-pool', authMiddleware);
  app.use('/wing-pool', transactionMiddleware);
  mountWingPool(app);

  app.use('/decisions', authMiddleware);
  app.use('/decisions', transactionMiddleware);
  app.use('/decisions/suggestions', authMiddleware);
  app.use('/decisions/suggestions', transactionMiddleware);
  app.use('/decisions/suggestions/act', authMiddleware);
  app.use('/decisions/suggestions/act', transactionMiddleware);
  app.use('/decisions/pending-suggestions', authMiddleware);
  app.use('/decisions/pending-suggestions', transactionMiddleware);
  mountDecisions(app);

  app.use('/profiles/me', authMiddleware);
  app.use('/profiles/me', transactionMiddleware);
  app.use('/profiles/:userId', authMiddleware);
  app.use('/profiles/:userId', transactionMiddleware);
  app.use('/dating-profiles', authMiddleware);
  app.use('/dating-profiles', transactionMiddleware);
  app.use('/dating-profiles/me', authMiddleware);
  app.use('/dating-profiles/me', transactionMiddleware);
  mountProfiles(app);

  app.use('/matches', authMiddleware);
  app.use('/matches', transactionMiddleware);
  app.use('/matches/:matchId/sheet', authMiddleware);
  app.use('/matches/:matchId/sheet', transactionMiddleware);
  mountMatches(app);

  app.onError(errorHandler);

  return app;
}
