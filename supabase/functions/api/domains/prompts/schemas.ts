import { z } from '@hono/zod-openapi';

export const PromptTemplate = z
  .object({
    id: z.string().uuid(),
    question: z.string(),
  })
  .openapi('PromptTemplate');

export const PromptTemplatesResponse = z.array(PromptTemplate).openapi('PromptTemplatesResponse');

export const PromptResponseAuthor = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('PromptsPromptResponseAuthor');

export const PromptResponse = z
  .object({
    id: z.string().uuid(),
    profilePromptId: z.string().uuid(),
    message: z.string(),
    isApproved: z.boolean(),
    userId: z.string().uuid(),
    createdAt: z.string(),
    author: PromptResponseAuthor.nullable(),
  })
  .openapi('PromptResponse');

export const ProfilePrompt = z
  .object({
    id: z.string().uuid(),
    datingProfileId: z.string().uuid(),
    answer: z.string(),
    createdAt: z.string(),
    template: PromptTemplate,
    responses: z.array(PromptResponse),
  })
  .openapi('ProfilePrompt');

export const ProfilePromptsResponse = z.array(ProfilePrompt).openapi('ProfilePromptsResponse');

export const CreateProfilePromptRequest = z
  .object({
    promptTemplateId: z.string().uuid(),
    answer: z.string().trim().min(1),
  })
  .openapi('CreateProfilePromptRequest');

export const ProfilePromptIdParam = z
  .object({ id: z.string().uuid() })
  .openapi('ProfilePromptIdParam');

export const CreatePromptResponseRequest = z
  .object({
    profilePromptId: z.string().uuid(),
    message: z.string().trim().min(1),
  })
  .openapi('CreatePromptResponseRequest');

export const PromptResponseIdParam = z
  .object({ id: z.string().uuid() })
  .openapi('PromptResponseIdParam');

export const OkResponse = z
  .object({ ok: z.literal(true) })
  .openapi('PromptsOkResponse');

export type PromptTemplate = z.infer<typeof PromptTemplate>;
export type ProfilePrompt = z.infer<typeof ProfilePrompt>;
export type PromptResponse = z.infer<typeof PromptResponse>;
export type CreateProfilePromptRequest = z.infer<typeof CreateProfilePromptRequest>;
export type CreatePromptResponseRequest = z.infer<typeof CreatePromptResponseRequest>;
