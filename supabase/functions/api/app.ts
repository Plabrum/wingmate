import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { authMiddleware, type AuthVars } from './middleware/auth.ts';
import { errorHandler } from './middleware/error.ts';
import { mountDiscover } from './domains/discover/route.ts';

export function createApp() {
  const app = new OpenAPIHono<{ Variables: AuthVars }>().basePath('/api');

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

  app.use('/discover', authMiddleware);
  mountDiscover(app);

  app.onError(errorHandler);

  return app;
}
