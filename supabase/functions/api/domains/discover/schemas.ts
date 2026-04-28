import { z } from '@hono/zod-openapi';
import { city, datingStatus, gender, interest } from '../../db/schema.ts';

const genderValues = gender.enumValues;
const cityValues = city.enumValues;
const datingStatusValues = datingStatus.enumValues;
const interestValues = interest.enumValues;

export const DiscoverQuery = z.object({
  filterWingerId: z.string().uuid().optional().openapi({ example: undefined }),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  pageOffset: z.coerce.number().int().min(0).default(0),
  wingerOnly: z.coerce.boolean().optional(),
  likesYouOnly: z.coerce.boolean().optional(),
}).openapi('DiscoverQuery');

export const DiscoverProfile = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  chosenName: z.string(),
  gender: z.enum(genderValues).nullable(),
  age: z.number().int(),
  city: z.enum(cityValues),
  bio: z.string().nullable(),
  datingStatus: z.enum(datingStatusValues),
  interests: z.array(z.enum(interestValues)),
  firstPhoto: z.string().nullable(),
  wingNote: z.string().nullable(),
  suggestedBy: z.string().uuid().nullable(),
  suggesterName: z.string().nullable(),
}).openapi('DiscoverProfile');

export const DiscoverResponse = z.array(DiscoverProfile).openapi('DiscoverResponse');

export type DiscoverProfile = z.infer<typeof DiscoverProfile>;
