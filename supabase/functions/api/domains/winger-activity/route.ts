import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../../types.ts';
import { WingerActivityResponse, type ActivityRow } from './schemas.ts';
import { fetchWingerReplyActivity, fetchWingerSuggestionActivity } from './queries.ts';
import { buildActivityFeed } from './transformers.ts';
import { getDeps } from '../../lib/deps.ts';

const WingerActivityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).openapi('WingerActivityQuery');

const wingerActivityRoute = createRoute({
  method: 'get',
  path: '/winger-activity',
  tags: ['winger-activity'],
  security: [{ Bearer: [] }],
  request: { query: WingerActivityQuery },
  responses: {
    200: {
      description: 'Recent winger activity: suggestion outcomes and authored prompt replies, newest first',
      content: { 'application/json': { schema: WingerActivityResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

export function mountWingerActivity(app: OpenAPIHono<AppEnv>) {
  app.openapi(wingerActivityRoute, async (c) => {
    const { userId: wingerId, db } = getDeps(c);
    const { limit } = c.req.valid('query');

    const [suggestions, replies] = await Promise.all([
      fetchWingerSuggestionActivity(db, wingerId, limit),
      fetchWingerReplyActivity(db, wingerId, limit),
    ]);

    const body: ActivityRow[] = buildActivityFeed(suggestions, replies, limit);
    return c.json(body, 200);
  });
}
