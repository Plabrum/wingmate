import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import { WingPoolQuery, WingPoolResponse, type WingProfile } from './schemas.ts';
import { fetchWingPool, isActiveWingperson } from './queries.ts';
import { rowToWingProfile } from './transformers.ts';
import { getDeps } from '../../lib/deps.ts';

const wingPoolRoute = createRoute({
  method: 'get',
  path: '/wing-pool',
  tags: ['wing-pool'],
  security: [{ Bearer: [] }],
  request: { query: WingPoolQuery },
  responses: {
    200: {
      description: 'Profiles the wingperson can suggest for the given dater',
      content: { 'application/json': { schema: WingPoolResponse } },
    },
    401: { description: 'Unauthenticated' },
    403: { description: 'Caller is not an active wingperson for this dater' },
  },
});

export function mountWingPool(app: OpenAPIHono<AppEnv>) {
  app.openapi(wingPoolRoute, async (c) => {
    const { userId: wingerId, db } = getDeps(c);
    const { daterId, pageSize, pageOffset } = c.req.valid('query');

    const allowed = await isActiveWingperson(db, wingerId, daterId);
    if (!allowed) {
      throw new HTTPException(403, { message: 'No active wingperson relationship' });
    }

    const rows = await fetchWingPool(db, { wingerId, daterId, pageSize, pageOffset });
    const body: WingProfile[] = rows.map(rowToWingProfile);
    return c.json(body, 200);
  });
}
