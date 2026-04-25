import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { z } from '@hono/zod-openapi';
import type { AppEnv } from '../../types.ts';
import {
  CreateDatingProfileRequest,
  CreateDatingProfileResponse,
  OwnDatingProfileResponse,
  Profile,
  PublicProfile,
  UpdateDatingProfileRequest,
  UpdateProfileRequest,
} from './schemas.ts';
import {
  fetchOwnDatingProfile,
  fetchOwnProfile,
  fetchPublicProfile,
  insertDatingProfile,
  updateOwnDatingProfile,
  updateOwnProfile,
} from './queries.ts';
import {
  bundleToOwnDatingProfile,
  bundleToPublicProfile,
  rowToProfile,
} from './transformers.ts';

const UserIdParam = z.object({ userId: z.string().uuid() }).openapi('UserIdParam');

const getOwnProfileRoute = createRoute({
  method: 'get',
  path: '/profiles/me',
  tags: ['profiles'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Own profile',
      content: { 'application/json': { schema: Profile } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Profile not found' },
  },
});

const updateOwnProfileRoute = createRoute({
  method: 'patch',
  path: '/profiles/me',
  tags: ['profiles'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: UpdateProfileRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Updated own profile',
      content: { 'application/json': { schema: Profile } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Profile not found' },
  },
});

const getOwnDatingProfileRoute = createRoute({
  method: 'get',
  path: '/dating-profiles/me',
  tags: ['profiles'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Own dating profile (or null if not yet created)',
      content: { 'application/json': { schema: OwnDatingProfileResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const createDatingProfileRoute = createRoute({
  method: 'post',
  path: '/dating-profiles',
  tags: ['profiles'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateDatingProfileRequest } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Dating profile created',
      content: { 'application/json': { schema: CreateDatingProfileResponse } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
    409: { description: 'Dating profile already exists' },
  },
});

const updateDatingProfileRoute = createRoute({
  method: 'patch',
  path: '/dating-profiles/me',
  tags: ['profiles'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateDatingProfileRequest } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Updated dating profile',
      content: { 'application/json': { schema: OwnDatingProfileResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Dating profile not found' },
  },
});

const getPublicProfileRoute = createRoute({
  method: 'get',
  path: '/profiles/{userId}',
  tags: ['profiles'],
  security: [{ Bearer: [] }],
  request: { params: UserIdParam },
  responses: {
    200: {
      description: 'Public profile',
      content: { 'application/json': { schema: PublicProfile } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Profile not found' },
  },
});

export function mountProfiles(app: OpenAPIHono<AppEnv>) {
  app.openapi(getOwnProfileRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const row = await fetchOwnProfile(db, userId);
    if (!row) throw new HTTPException(404, { message: 'Profile not found' });
    return c.json(rowToProfile(row), 200);
  });

  app.openapi(updateOwnProfileRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const fields = c.req.valid('json');
    const row = await updateOwnProfile(db, userId, fields);
    if (!row) throw new HTTPException(404, { message: 'Profile not found' });
    return c.json(rowToProfile(row), 200);
  });

  app.openapi(getOwnDatingProfileRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const bundle = await fetchOwnDatingProfile(db, userId);
    return c.json(bundle ? bundleToOwnDatingProfile(bundle) : null, 200);
  });

  app.openapi(createDatingProfileRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const fields = c.req.valid('json');

    const existing = await fetchOwnDatingProfile(db, userId);
    if (existing) {
      throw new HTTPException(409, { message: 'Dating profile already exists' });
    }

    const { id } = await insertDatingProfile(db, userId, fields);
    return c.json({ id }, 200);
  });

  app.openapi(updateDatingProfileRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const fields = c.req.valid('json');

    const { updated } = await updateOwnDatingProfile(db, userId, fields);
    if (!updated) {
      throw new HTTPException(404, { message: 'Dating profile not found' });
    }

    const bundle = await fetchOwnDatingProfile(db, userId);
    return c.json(bundle ? bundleToOwnDatingProfile(bundle) : null, 200);
  });

  app.openapi(getPublicProfileRoute, async (c) => {
    const db = c.get('db');
    const { userId } = c.req.valid('param');
    const bundle = await fetchPublicProfile(db, userId);
    if (!bundle) throw new HTTPException(404, { message: 'Profile not found' });
    return c.json(bundleToPublicProfile(bundle), 200);
  });
}
