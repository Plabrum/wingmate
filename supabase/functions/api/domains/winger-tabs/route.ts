import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { AppEnv } from '../../types.ts';
import { WingerTabsResponse, type WingerTab } from './schemas.ts';
import { fetchWingerTabs } from './queries.ts';
import { rowsToWingerTabs } from './transformers.ts';

const wingerTabsRoute = createRoute({
  method: 'get',
  path: '/winger-tabs',
  tags: ['winger-tabs'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Distinct wingers with pending suggestions for the viewer, most recent first',
      content: { 'application/json': { schema: WingerTabsResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

export function mountWingerTabs(app: OpenAPIHono<AppEnv>) {
  app.openapi(wingerTabsRoute, async (c) => {
    const viewerId = c.get('userId');
    const db = c.get('db');

    const rows = await fetchWingerTabs(db, viewerId);
    const body: WingerTab[] = rowsToWingerTabs(rows);
    return c.json(body, 200);
  });
}
