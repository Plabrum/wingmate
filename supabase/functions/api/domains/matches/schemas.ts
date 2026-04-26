import { z } from '@hono/zod-openapi';
import { city, interest } from '../../db/schema.ts';

const cityValues = city.enumValues;
const interestValues = interest.enumValues;

export const MatchSummaryOther = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    age: z.number().int().nullable(),
    city: z.enum(cityValues).nullable(),
    bio: z.string().nullable(),
    interests: z.array(z.enum(interestValues)),
    firstPhoto: z.string().nullable(),
  })
  .openapi('MatchSummaryOther');

export const MatchSummary = z
  .object({
    matchId: z.string().uuid(),
    createdAt: z.string(),
    hasMessages: z.boolean(),
    other: MatchSummaryOther,
  })
  .openapi('MatchSummary');

export const MatchesResponse = z.array(MatchSummary).openapi('MatchesResponse');

export const MatchSheetWinger = z
  .object({
    id: z.string().uuid(),
    chosenName: z.string().nullable(),
  })
  .openapi('MatchSheetWinger');

export const MatchSheetWingNote = z
  .object({
    note: z.string(),
    suggestedBy: z.string().uuid().nullable(),
    winger: MatchSheetWinger.nullable(),
  })
  .openapi('MatchSheetWingNote');

export const MatchSheetPromptTemplate = z
  .object({
    id: z.string().uuid(),
    question: z.string(),
  })
  .openapi('MatchSheetPromptTemplate');

export const MatchSheetPrompt = z
  .object({
    id: z.string().uuid(),
    answer: z.string(),
    template: MatchSheetPromptTemplate.nullable(),
  })
  .openapi('MatchSheetPrompt');

export const MatchSheet = z
  .object({
    wingNote: MatchSheetWingNote.nullable(),
    prompts: z.array(MatchSheetPrompt),
  })
  .openapi('MatchSheet');

export const MatchIdParam = z
  .object({ matchId: z.string().uuid() })
  .openapi('MatchIdParam');

export type MatchSummary = z.infer<typeof MatchSummary>;
export type MatchSummaryOther = z.infer<typeof MatchSummaryOther>;
export type MatchSheet = z.infer<typeof MatchSheet>;
export type MatchSheetWingNote = z.infer<typeof MatchSheetWingNote>;
export type MatchSheetPrompt = z.infer<typeof MatchSheetPrompt>;
