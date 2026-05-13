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
  PhotoUploadUrlRequest,
  PhotoUploadUrlResponse,
  ReorderPhotoRequest,
  type Photo as PhotoT,
} from './schemas.ts';
import {
  approveOwnedPhoto,
  deleteOwnedPhoto,
  fetchDatingProfileOwner,
  fetchOwnPhotos,
  getDaterPushAndSuggesterName,
  insertPhoto,
  isActiveWingperson,
  reorderOwnedPhoto,
} from './queries.ts';
import { rowToPhoto } from './transformers.ts';
import { createSignedUploadToken, removeProfilePhoto } from '../../lib/storage.ts';
import { getDeps } from '../../lib/deps.ts';

// trigger redeploy
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

const deletePhotoRoute = createRoute({
  method: 'delete',
  path: '/photos/{id}',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  request: { params: PhotoIdParam },
  responses: {
    200: {
      description: 'Photo deleted',
      content: { 'application/json': { schema: OkResponse } },
    },
    401: { description: 'Unauthenticated' },
    404: { description: 'Photo not found for this caller' },
  },
});

const photoUploadUrlRoute = createRoute({
  method: 'post',
  path: '/photos/upload-url',
  tags: ['photos'],
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: PhotoUploadUrlRequest } }, required: true },
  },
  responses: {
    200: {
      description: 'Signed upload URL into the dater\'s profile-photos folder',
      content: { 'application/json': { schema: PhotoUploadUrlResponse } },
    },
    401: { description: 'Unauthenticated' },
    403: { description: 'Caller is not the dater or an active wingperson' },
    404: { description: 'Dating profile not found' },
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
    const { userId, db } = getDeps(c);
    const rows = await fetchOwnPhotos(db, userId);
    const body: PhotoT[] = rows.map(rowToPhoto);
    return c.json(body, 200);
  });

  app.openapi(createPhotoRoute, async (c) => {
    const { userId: callerId, db, push } = getDeps(c);
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

    if (!isOwner) {
      const { daterToken, suggesterName } = await getDaterPushAndSuggesterName(
        db,
        ownerId,
        callerId,
      );
      await push.send(
        daterToken,
        'New photo suggestion 📸',
        `${suggesterName ?? 'Your wingperson'} suggested a photo for your profile.`,
      );
    }

    return c.json(rowToPhoto(inserted), 200);
  });

  app.openapi(photoUploadUrlRoute, async (c) => {
    const { userId: callerId, db, token } = getDeps(c);
    const { datingProfileId, filename } = c.req.valid('json');

    const ownerId = await fetchDatingProfileOwner(db, datingProfileId);
    if (!ownerId) throw new HTTPException(404, { message: 'Dating profile not found' });

    if (ownerId !== callerId) {
      const allowed = await isActiveWingperson(db, ownerId, callerId);
      if (!allowed) {
        throw new HTTPException(403, { message: 'Not the dater or an active wingperson' });
      }
    }

    const dot = filename.lastIndexOf('.');
    const ext = dot > 0 && dot < filename.length - 1 ? filename.slice(dot + 1) : 'jpg';
    const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
    const { uploadToken } = await createSignedUploadToken(token, path);
    return c.json({ path, uploadToken }, 200);
  });

  app.openapi(approvePhotoRoute, async (c) => {
    const { userId, db } = getDeps(c);
    const { id } = c.req.valid('param');

    const row = await approveOwnedPhoto(db, id, userId);
    if (!row) throw new HTTPException(404, { message: 'Photo not found' });
    return c.json(rowToPhoto(row), 200);
  });

  app.openapi(rejectPhotoRoute, async (c) => {
    const { userId, db, token } = getDeps(c);
    const { id } = c.req.valid('param');

    const { deleted, storageUrl } = await deleteOwnedPhoto(db, id, userId);
    if (!deleted) throw new HTTPException(404, { message: 'Photo not found' });
    if (storageUrl) await removeProfilePhoto(token, storageUrl);
    return c.json({ ok: true } as const, 200);
  });

  app.openapi(deletePhotoRoute, async (c) => {
    const { userId, db, token } = getDeps(c);
    const { id } = c.req.valid('param');

    const { deleted, storageUrl } = await deleteOwnedPhoto(db, id, userId);
    if (!deleted) throw new HTTPException(404, { message: 'Photo not found' });
    if (storageUrl) await removeProfilePhoto(token, storageUrl);
    return c.json({ ok: true } as const, 200);
  });

  app.openapi(reorderPhotoRoute, async (c) => {
    const { userId, db } = getDeps(c);
    const { id } = c.req.valid('param');
    const { displayOrder } = c.req.valid('json');

    const row = await reorderOwnedPhoto(db, id, userId, displayOrder);
    if (!row) throw new HTTPException(404, { message: 'Photo not found' });
    return c.json(rowToPhoto(row), 200);
  });
}
