import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { authMiddleware } from './middleware/auth.ts';
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

  app.use('/conversations', authMiddleware);
  app.use('/conversations', transactionMiddleware);
  app.use('/matches/:matchId/messages', authMiddleware);
  app.use('/matches/:matchId/messages', transactionMiddleware);
  app.use('/matches/:matchId/messages/read', authMiddleware);
  app.use('/matches/:matchId/messages/read', transactionMiddleware);
  mountMessages(app);

  app.use('/photos', authMiddleware);
  app.use('/photos', transactionMiddleware);
  app.use('/photos/me', authMiddleware);
  app.use('/photos/me', transactionMiddleware);
  app.use('/photos/:id/approve', authMiddleware);
  app.use('/photos/:id/approve', transactionMiddleware);
  app.use('/photos/:id/reject', authMiddleware);
  app.use('/photos/:id/reject', transactionMiddleware);
  app.use('/photos/:id/reorder', authMiddleware);
  app.use('/photos/:id/reorder', transactionMiddleware);
  mountPhotos(app);

  app.use('/prompt-templates', authMiddleware);
  app.use('/prompt-templates', transactionMiddleware);
  app.use('/prompt-templates/onboarding', authMiddleware);
  app.use('/prompt-templates/onboarding', transactionMiddleware);
  app.use('/profile-prompts', authMiddleware);
  app.use('/profile-prompts', transactionMiddleware);
  app.use('/profile-prompts/me', authMiddleware);
  app.use('/profile-prompts/me', transactionMiddleware);
  app.use('/profile-prompts/:id', authMiddleware);
  app.use('/profile-prompts/:id', transactionMiddleware);
  app.use('/prompt-responses', authMiddleware);
  app.use('/prompt-responses', transactionMiddleware);
  app.use('/prompt-responses/:id', authMiddleware);
  app.use('/prompt-responses/:id', transactionMiddleware);
  app.use('/prompt-responses/:id/approve', authMiddleware);
  app.use('/prompt-responses/:id/approve', transactionMiddleware);
  mountPrompts(app);

  app.use('/wingpeople', authMiddleware);
  app.use('/wingpeople', transactionMiddleware);
  app.use('/wingpeople/invite', authMiddleware);
  app.use('/wingpeople/invite', transactionMiddleware);
  app.use('/wingpeople/:id', authMiddleware);
  app.use('/wingpeople/:id', transactionMiddleware);
  app.use('/wingpeople/:id/accept', authMiddleware);
  app.use('/wingpeople/:id/accept', transactionMiddleware);
  app.use('/wingpeople/:id/decline', authMiddleware);
  app.use('/wingpeople/:id/decline', transactionMiddleware);
  mountContacts(app);

  app.onError(errorHandler);

  return app;
}
