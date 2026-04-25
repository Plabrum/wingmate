import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { authMiddleware } from './middleware/auth.ts';
import { transactionMiddleware } from './middleware/transaction.ts';
import { errorHandler } from './middleware/error.ts';
import { mountDiscover } from './domains/discover/route.ts';
import { mountWingerTabs } from './domains/winger-tabs/route.ts';
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

  app.use('/winger-tabs', authMiddleware);
  app.use('/winger-tabs', transactionMiddleware);
  mountWingerTabs(app);

  app.onError(errorHandler);

  return app;
}
