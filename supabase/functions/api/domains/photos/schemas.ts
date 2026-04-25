import { z } from '@hono/zod-openapi';

export const PhotoSuggester = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
  })
  .openapi('PhotoSuggesterRef');

export const Photo = z
  .object({
    id: z.string().uuid(),
    datingProfileId: z.string().uuid(),
    storageUrl: z.string(),
    displayOrder: z.number().int(),
    approvedAt: z.string().nullable(),
    suggesterId: z.string().uuid().nullable(),
    suggester: PhotoSuggester.nullable(),
  })
  .openapi('Photo');

export const OwnPhotosResponse = z.array(Photo).openapi('OwnPhotosResponse');

export const CreatePhotoRequest = z
  .object({
    datingProfileId: z.string().uuid(),
    storageUrl: z.string().min(1),
    displayOrder: z.number().int().min(0),
  })
  .openapi('CreatePhotoRequest');

export const ReorderPhotoRequest = z
  .object({
    displayOrder: z.number().int().min(0),
  })
  .openapi('ReorderPhotoRequest');

export const PhotoIdParam = z
  .object({ id: z.string().uuid() })
  .openapi('PhotoIdParam');

export const OkResponse = z
  .object({ ok: z.literal(true) })
  .openapi('PhotosOkResponse');

export type Photo = z.infer<typeof Photo>;
export type CreatePhotoRequest = z.infer<typeof CreatePhotoRequest>;
export type ReorderPhotoRequest = z.infer<typeof ReorderPhotoRequest>;
