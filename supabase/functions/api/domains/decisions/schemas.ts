import { z } from '@hono/zod-openapi';
import { decisionType } from '../../db/schema.ts';

const decisionTypeValues = decisionType.enumValues as [string, ...string[]];

export const Match = z
  .object({
    id: z.string().uuid(),
    userAId: z.string().uuid(),
    userBId: z.string().uuid(),
    createdAt: z.string(),
  })
  .openapi('Match');

export const DirectDecisionRequest = z
  .object({
    recipientId: z.string().uuid(),
    decision: z.enum(decisionTypeValues),
  })
  .openapi('DirectDecisionRequest');

export const DirectDecisionResponse = z
  .object({
    created: z.boolean(),
    match: Match.nullable(),
  })
  .openapi('DirectDecisionResponse');

export const ActSuggestionRequest = z
  .object({
    recipientId: z.string().uuid(),
    decision: z.enum(decisionTypeValues),
  })
  .openapi('ActSuggestionRequest');

export const ActSuggestionResponse = z
  .object({
    match: Match.nullable(),
  })
  .openapi('ActSuggestionResponse');

// Winger creates a suggestion. `decision` is null for a normal suggestion the
// dater needs to act on, or 'declined' to bypass the dater entirely.
export const SuggestRequest = z
  .object({
    daterId: z.string().uuid(),
    recipientId: z.string().uuid(),
    note: z.string().nullable().optional(),
    decision: z.literal('declined').nullable(),
  })
  .openapi('SuggestRequest');

export const SuggestResponse = z
  .object({
    ok: z.literal(true),
  })
  .openapi('SuggestResponse');

export const PendingSuggestion = z
  .object({
    id: z.string().uuid(),
    recipientId: z.string().uuid(),
    note: z.string().nullable(),
    createdAt: z.string(),
    wingerId: z.string().uuid().nullable(),
    wingerName: z.string().nullable(),
  })
  .openapi('PendingSuggestion');

export const PendingSuggestionsResponse = z
  .array(PendingSuggestion)
  .openapi('PendingSuggestionsResponse');

export type Match = z.infer<typeof Match>;
export type PendingSuggestion = z.infer<typeof PendingSuggestion>;
