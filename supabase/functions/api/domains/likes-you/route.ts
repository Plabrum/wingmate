import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { AppEnv } from '../../types.ts';
import {
  LikesYouCountResponse,
  LikesYouQuery,
  LikesYouResponse,
  type LikesYouProfile,
} from './schemas.ts';
import { fetchLikesYouCount, fetchLikesYouPool } from './queries.ts';
import { rowToLikesYouProfile } from './transformers.ts';
import { getDeps } from '../../lib/deps.ts';

const likesYouRoute = createRoute({
  method: 'get',
  path: '/likes-you',
  tags: ['likes-you'],
  security: [{ Bearer: [] }],
  request: { query: LikesYouQuery },
  responses: {
    200: {
      description: 'Profiles who have liked the viewer and remain available',
      content: { 'application/json': { schema: LikesYouResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const likesYouCountRoute = createRoute({
  method: 'get',
  path: '/likes-you/count',
  tags: ['likes-you'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Count of pending inbound likes for the viewer',
      content: { 'application/json': { schema: LikesYouCountResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

export function mountLikesYou(app: OpenAPIHono<AppEnv>) {
  app.openapi(likesYouRoute, async (c) => {
    const { userId: viewerId, db } = getDeps(c);
    const query = c.req.valid('query');

    const rows = await fetchLikesYouPool(db, {
      viewerId,
      pageSize: query.pageSize,
      pageOffset: query.pageOffset,
    });

    const body: LikesYouProfile[] = rows.map(rowToLikesYouProfile);
    return c.json(body, 200);
  });

  app.openapi(likesYouCountRoute, async (c) => {
    const { userId: viewerId, db } = getDeps(c);

    const count = await fetchLikesYouCount(db, viewerId);
    return c.json({ count }, 200);
  });
}
