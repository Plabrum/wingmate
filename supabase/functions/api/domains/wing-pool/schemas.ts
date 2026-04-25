import { z } from '@hono/zod-openapi';
import { city, datingStatus, gender, interest } from '../../db/schema.ts';

const genderValues = gender.enumValues as [string, ...string[]];
const cityValues = city.enumValues as [string, ...string[]];
const datingStatusValues = datingStatus.enumValues as [string, ...string[]];
const interestValues = interest.enumValues as [string, ...string[]];

export const WingPoolQuery = z.object({
  daterId: z.string().uuid(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  pageOffset: z.coerce.number().int().min(0).default(0),
}).openapi('WingPoolQuery');

export const WingProfile = z.object({
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
}).openapi('WingProfile');

export const WingPoolResponse = z.array(WingProfile).openapi('WingPoolResponse');

export type WingProfile = z.infer<typeof WingProfile>;
