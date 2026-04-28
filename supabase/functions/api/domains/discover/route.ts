// TEMPLATE: this is the canonical layout for a feature on the `api` function.
// Feature code lives in `domains/<feature>/`. Four sibling files per feature dir:
//   • route.ts        — Hono createRoute + mount<Feature>(app) (THIS FILE)
//   • schemas.ts      — Zod request/response, enum literals derived from Drizzle pgEnum
//   • queries.ts      — pure Drizzle fetch functions, accept `db: DBOrTx` as first arg,
//                       no Hono/Zod imports
//   • transformers.ts — row → response mappers (snake_case → camelCase)
//
// Handlers pull request context with `const { db, userId } = getDeps(c)` (from
// `lib/deps.ts`) and pass them to query helpers. NEVER import the module-level
// `db` from `db/client.ts` inside handlers or queries — that bypasses the
// per-request transaction and its rollback semantics. Normal returns (including
// `c.json(..., 4xx)`) commit; any thrown error (including `HTTPException`) rolls back.
//
// Shared helpers at api/ root (e.g. lib/, schemas/) are introduced ONLY when something
// is genuinely reused across domains. Prefer duplication over premature hoisting.

import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { AppEnv } from '../../types.ts';
import { DiscoverQuery, DiscoverResponse, type DiscoverProfile } from './schemas.ts';
import { fetchDiscoverPool } from './queries.ts';
import { rowToDiscoverProfile } from './transformers.ts';
import { getDeps } from '../../lib/deps.ts';

const discoverRoute = createRoute({
  method: 'get',
  path: '/discover',
  tags: ['discover'],
  security: [{ Bearer: [] }],
  request: { query: DiscoverQuery },
  responses: {
    200: {
      description: 'Discover pool for the viewer',
      content: { 'application/json': { schema: DiscoverResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

export function mountDiscover(app: OpenAPIHono<AppEnv>) {
  app.openapi(discoverRoute, async (c) => {
    const { userId: viewerId, db } = getDeps(c);
    const query = c.req.valid('query');

    const rows = await fetchDiscoverPool(db, {
      viewerId,
      filterWingerId: query.filterWingerId,
      pageSize: query.pageSize,
      pageOffset: query.pageOffset,
      wingerOnly: query.wingerOnly ? true : undefined,
      likesYouOnly: query.likesYouOnly ? true : undefined,
    });

    const body: DiscoverProfile[] = rows.map(rowToDiscoverProfile);
    return c.json(body, 200);
  });
}
