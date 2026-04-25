import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import { MatchIdParam, MatchSheet, MatchSummary, MatchesResponse } from './schemas.ts';
import {
  fetchMatchOtherUserId,
  fetchMatches,
  fetchPromptsForUser,
  fetchWingNoteForMatch,
} from './queries.ts';
import { buildMatchSheet, rowToMatch } from './transformers.ts';

const listMatchesRoute = createRoute({
  method: 'get',
  path: '/matches',
  tags: ['matches'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Matches for the viewer (other profile pre-selected)',
      content: { 'application/json': { schema: MatchesResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const getMatchSheetRoute = createRoute({
  method: 'get',
  path: '/matches/{matchId}/sheet',
  tags: ['matches'],
  security: [{ Bearer: [] }],
  request: { params: MatchIdParam },
  responses: {
    200: {
      description: 'Wing note + prompts for the other person in the match',
      content: { 'application/json': { schema: MatchSheet } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Match not found or viewer is not party to it' },
  },
});

export function mountMatches(app: OpenAPIHono<AppEnv>) {
  app.openapi(listMatchesRoute, async (c) => {
    const viewerId = c.get('userId');
    const db = c.get('db');
    const rows = await fetchMatches(db, viewerId);
    const body: MatchSummary[] = rows.map(rowToMatch);
    return c.json(body, 200);
  });

  app.openapi(getMatchSheetRoute, async (c) => {
    const viewerId = c.get('userId');
    const db = c.get('db');
    const { matchId } = c.req.valid('param');

    const otherUserId = await fetchMatchOtherUserId(db, viewerId, matchId);
    if (!otherUserId) throw new HTTPException(404, { message: 'Match not found' });

    const [wingNoteRow, promptRows] = await Promise.all([
      fetchWingNoteForMatch(db, viewerId, otherUserId),
      fetchPromptsForUser(db, otherUserId),
    ]);

    return c.json(buildMatchSheet(wingNoteRow, promptRows), 200);
  });
}
