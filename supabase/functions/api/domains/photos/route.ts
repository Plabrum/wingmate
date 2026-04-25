import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../../types.ts';
import {
  CreatePhotoRequest,
  OkResponse,
  OwnPhotosResponse,
  Photo,
  PhotoIdParam,
  ReorderPhotoRequest,
  type Photo as PhotoT,
} from './schemas.ts';
import {
  approveOwnedPhoto,
  deleteOwnedPhoto,
  fetchDatingProfileOwner,
  fetchOwnPhotos,
  insertPhoto,
  isActiveWingperson,
  reorderOwnedPhoto,
} from './queries.ts';
import { rowToPhoto } from './transformers.ts';

const listOwnPhotosRoute = createRoute({
  method: 'get',
  path: '/photos/me',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Photos on the caller\'s dating profile',
      content: { 'application/json': { schema: OwnPhotosResponse } },
    },
    401: { description: 'Unauthenticated' },
  },
});

const createPhotoRoute = createRoute({
  method: 'post',
  path: '/photos',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreatePhotoRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Photo metadata created',
      content: { 'application/json': { schema: Photo } },
    },
    400: { description: 'Invalid input' },
    401: { description: 'Unauthenticated' },
    403: { description: 'Caller is not the dater or an active wingperson' },
    404: { description: 'Dating profile not found' },
  },
});

const approvePhotoRoute = createRoute({
  method: 'post',
  path: '/photos/{id}/approve',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  request: { params: PhotoIdParam },
  responses: {
    200: {
      description: 'Photo approved',
      content: { 'application/json': { schema: Photo } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Photo not found for this caller' },
  },
});

const rejectPhotoRoute = createRoute({
  method: 'post',
  path: '/photos/{id}/reject',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  request: { params: PhotoIdParam },
  responses: {
    200: {
      description: 'Photo metadata rejected and removed',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Photo not found for this caller' },
  },
});

const reorderPhotoRoute = createRoute({
  method: 'patch',
  path: '/photos/{id}/reorder',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  request: {
    params: PhotoIdParam,
    body: { content: { 'application/json': { schema: ReorderPhotoRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Photo reordered',
      content: { 'application/json': { schema: Photo } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Photo not found for this caller' },
  },
});

export function mountPhotos(app: OpenAPIHono<AppEnv>) {
  app.openapi(listOwnPhotosRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const rows = await fetchOwnPhotos(db, userId);
    const body: PhotoT[] = rows.map(rowToPhoto);
    return c.json(body, 200);
  });

  app.openapi(createPhotoRoute, async (c) => {
    const callerId = c.get('userId');
    const db = c.get('db');
    const { datingProfileId, storageUrl, displayOrder } = c.req.valid('json');

    const ownerId = await fetchDatingProfileOwner(db, datingProfileId);
    if (!ownerId) throw new HTTPException(404, { message: 'Dating profile not found' });

    const isOwner = ownerId === callerId;
    if (!isOwner) {
      const allowed = await isActiveWingperson(db, ownerId, callerId);
      if (!allowed) {
        throw new HTTPException(403, { message: 'Not the dater or an active wingperson' });
      }
    }

    const inserted = await insertPhoto(db, {
      datingProfileId,
      storageUrl,
      displayOrder,
      suggesterId: isOwner ? null : callerId,
    });
    return c.json(rowToPhoto(inserted), 200);
  });

  app.openapi(approvePhotoRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { id } = c.req.valid('param');

    const row = await approveOwnedPhoto(db, id, userId);
    if (!row) throw new HTTPException(404, { message: 'Photo not found' });
    return c.json(rowToPhoto(row), 200);
  });

  app.openapi(rejectPhotoRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { id } = c.req.valid('param');

    const { deleted } = await deleteOwnedPhoto(db, id, userId);
    if (!deleted) throw new HTTPException(404, { message: 'Photo not found' });
    return c.json({ ok: true } as const, 200);
  });

  app.openapi(reorderPhotoRoute, async (c) => {
    const userId = c.get('userId');
    const db = c.get('db');
    const { id } = c.req.valid('param');
    const { displayOrder } = c.req.valid('json');

    const row = await reorderOwnedPhoto(db, id, userId, displayOrder);
    if (!row) throw new HTTPException(404, { message: 'Photo not found' });
    return c.json(rowToPhoto(row), 200);
  });
}
