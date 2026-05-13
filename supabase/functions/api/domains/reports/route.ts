import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import { ReportRequest, ReportResponse } from './schemas.ts';
import { insertReport, upsertDeclineDecision } from './queries.ts';
import { getDeps } from '../../lib/deps.ts';

const reportRoute = createRoute({
  method: 'post',
  path: '/reports',
  tags: ['reports'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: ReportRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Report filed and profile removed from queue',
      content: { 'application/json': { schema: ReportResponse } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
  },
});

export function mountReports(app: OpenAPIHono<AppEnv>) {
  app.openapi(reportRoute, async (c) => {
    const { userId: reporterId, db } = getDeps(c);
    const { recipientId, reason } = c.req.valid('json');

    if (reporterId === recipientId) {
      throw new HTTPException(400, { message: 'Cannot report yourself' });
    }

    await insertReport(db, reporterId, recipientId, reason);
    await upsertDeclineDecision(db, reporterId, recipientId);

    return c.json({ ok: true } as const, 200);
  });
}
