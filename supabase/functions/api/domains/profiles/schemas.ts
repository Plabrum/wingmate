import { z } from '@hono/zod-openapi';
import { city, datingStatus, gender, interest, religion, userRole } from '../../db/schema.ts';

const cityValues = city.enumValues as [string, ...string[]];
const datingStatusValues = datingStatus.enumValues as [string, ...string[]];
const genderValues = gender.enumValues as [string, ...string[]];
const interestValues = interest.enumValues as [string, ...string[]];
const religionValues = religion.enumValues as [string, ...string[]];
const userRoleValues = userRole.enumValues as [string, ...string[]];

// ── Base profile ─────────────────────────────────────────────────────────────

export const Profile = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    gender: z.enum(genderValues).nullable(),
    role: z.enum(userRoleValues),
    pushToken: z.string().nullable(),
  })
  .openapi('Profile');

export const UpdateProfileRequest = z
  .object({
    chosenName: z.string().min(1).optional(),
    dateOfBirth: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    gender: z.enum(genderValues).nullable().optional(),
    role: z.enum(userRoleValues).optional(),
    pushToken: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  })
  .openapi('UpdateProfileRequest');

// ── Dating profile (own) ─────────────────────────────────────────────────────

export const PromptResponseAuthor = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('PromptResponseAuthor');

export const OwnPromptResponse = z
  .object({
    id: z.string().uuid(),
    message: z.string(),
    isApproved: z.boolean(),
    userId: z.string().uuid(),
    createdAt: z.string(),
    author: PromptResponseAuthor.nullable(),
  })
  .openapi('OwnPromptResponse');

export const PromptTemplateRef = z
  .object({
    id: z.string().uuid(),
    question: z.string(),
  })
  .openapi('PromptTemplateRef');

export const OwnProfilePrompt = z
  .object({
    id: z.string().uuid(),
    answer: z.string(),
    createdAt: z.string(),
    template: PromptTemplateRef,
    responses: z.array(OwnPromptResponse),
  })
  .openapi('OwnProfilePrompt');

export const PhotoSuggester = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
  })
  .openapi('PhotoSuggester');

export const OwnProfilePhoto = z
  .object({
    id: z.string().uuid(),
    storageUrl: z.string(),
    displayOrder: z.number().int(),
    approvedAt: z.string().nullable(),
    suggesterId: z.string().uuid().nullable(),
    suggester: PhotoSuggester.nullable(),
  })
  .openapi('OwnProfilePhoto');

export const OwnDatingProfile = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    bio: z.string().nullable(),
    city: z.enum(cityValues),
    interestedGender: z.array(z.enum(genderValues)),
    ageFrom: z.number().int(),
    ageTo: z.number().int().nullable(),
    religion: z.enum(religionValues),
    religiousPreference: z.enum(religionValues).nullable(),
    interests: z.array(z.enum(interestValues)),
    isActive: z.boolean(),
    datingStatus: z.enum(datingStatusValues),
    createdAt: z.string(),
    updatedAt: z.string(),
    photos: z.array(OwnProfilePhoto),
    prompts: z.array(OwnProfilePrompt),
  })
  .openapi('OwnDatingProfile');

export const OwnDatingProfileResponse = OwnDatingProfile.nullable().openapi(
  'OwnDatingProfileResponse',
);

export const CreateDatingProfileRequest = z
  .object({
    city: z.enum(cityValues),
    bio: z.string().optional(),
    ageFrom: z.number().int().min(18),
    ageTo: z.number().int().nullable().optional(),
    interestedGender: z.array(z.enum(genderValues)),
    religion: z.enum(religionValues),
    religiousPreference: z.enum(religionValues).nullable().optional(),
    interests: z.array(z.enum(interestValues)),
    datingStatus: z.enum(datingStatusValues).optional(),
  })
  .openapi('CreateDatingProfileRequest');

export const CreateDatingProfileResponse = z
  .object({
    id: z.string().uuid(),
  })
  .openapi('CreateDatingProfileResponse');

export const UpdateDatingProfileRequest = z
  .object({
    bio: z.string().nullable().optional(),
    city: z.enum(cityValues).optional(),
    ageFrom: z.number().int().min(18).optional(),
    ageTo: z.number().int().nullable().optional(),
    interestedGender: z.array(z.enum(genderValues)).optional(),
    religion: z.enum(religionValues).optional(),
    religiousPreference: z.enum(religionValues).nullable().optional(),
    interests: z.array(z.enum(interestValues)).optional(),
    datingStatus: z.enum(datingStatusValues).optional(),
    isActive: z.boolean().optional(),
  })
  .openapi('UpdateDatingProfileRequest');

// ── Public profile (winger viewing a dater) ──────────────────────────────────

export const PublicProfilePhoto = z
  .object({
    id: z.string().uuid(),
    storageUrl: z.string(),
    displayOrder: z.number().int(),
    approvedAt: z.string().nullable(),
    suggesterId: z.string().uuid().nullable(),
  })
  .openapi('PublicProfilePhoto');

export const PublicProfilePrompt = z
  .object({
    id: z.string().uuid(),
    answer: z.string(),
    createdAt: z.string(),
    template: PromptTemplateRef,
  })
  .openapi('PublicProfilePrompt');

export const PublicDatingProfile = z
  .object({
    id: z.string().uuid(),
    bio: z.string().nullable(),
    city: z.enum(cityValues),
    interests: z.array(z.enum(interestValues)),
    religion: z.enum(religionValues),
    photos: z.array(PublicProfilePhoto),
    prompts: z.array(PublicProfilePrompt),
  })
  .openapi('PublicDatingProfile');

export const PublicProfile = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    datingProfile: PublicDatingProfile.nullable(),
  })
  .openapi('PublicProfile');

// ── Type exports ─────────────────────────────────────────────────────────────

export type Profile = z.infer<typeof Profile>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
export type OwnDatingProfile = z.infer<typeof OwnDatingProfile>;
export type OwnProfilePhoto = z.infer<typeof OwnProfilePhoto>;
export type OwnProfilePrompt = z.infer<typeof OwnProfilePrompt>;
export type CreateDatingProfileRequest = z.infer<typeof CreateDatingProfileRequest>;
export type UpdateDatingProfileRequest = z.infer<typeof UpdateDatingProfileRequest>;
export type PublicProfile = z.infer<typeof PublicProfile>;
