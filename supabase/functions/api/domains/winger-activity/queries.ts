import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DBOrTx } from '../../db/client.ts';
import {
  datingProfiles,
  decisions,
  matches,
  profiles,
  profilePrompts,
  promptResponses,
  promptTemplates,
} from '../../db/schema.ts';
import type { SuggestionActivityRow, ReplyActivityRow } from './transformers.ts';

export async function fetchWingerSuggestionActivity(
  db: DBOrTx,
  wingerId: string,
  limit: number,
): Promise<SuggestionActivityRow[]> {
  const dater = alias(profiles, 'dater');
  const recipient = alias(profiles, 'recipient');

  const matchExistsExpr = sql<boolean>`exists (
    select 1 from ${matches}
    where (${matches.userAId} = ${decisions.actorId} and ${matches.userBId} = ${decisions.recipientId})
       or (${matches.userAId} = ${decisions.recipientId} and ${matches.userBId} = ${decisions.actorId})
  )`;

  const rows = await db
    .select({
      id: decisions.id,
      decision: decisions.decision,
      created_at: decisions.createdAt,
      dater_id: decisions.actorId,
      dater_name: dater.chosenName,
      recipient_name: recipient.chosenName,
      has_match: matchExistsExpr.as('has_match'),
    })
    .from(decisions)
    .innerJoin(dater, eq(dater.id, decisions.actorId))
    .innerJoin(recipient, eq(recipient.id, decisions.recipientId))
    .where(and(eq(decisions.suggestedBy, wingerId), isNotNull(decisions.suggestedBy)))
    .orderBy(desc(decisions.createdAt))
    .limit(limit);

  return rows as SuggestionActivityRow[];
}

export async function fetchWingerReplyActivity(
  db: DBOrTx,
  wingerId: string,
  limit: number,
): Promise<ReplyActivityRow[]> {
  const rows = await db
    .select({
      id: promptResponses.id,
      created_at: promptResponses.createdAt,
      dater_id: datingProfiles.userId,
      dater_name: profiles.chosenName,
      prompt_question: promptTemplates.question,
      message: promptResponses.message,
    })
    .from(promptResponses)
    .innerJoin(profilePrompts, eq(profilePrompts.id, promptResponses.profilePromptId))
    .innerJoin(promptTemplates, eq(promptTemplates.id, profilePrompts.promptTemplateId))
    .innerJoin(datingProfiles, eq(datingProfiles.id, profilePrompts.datingProfileId))
    .innerJoin(profiles, eq(profiles.id, datingProfiles.userId))
    .where(eq(promptResponses.userId, wingerId))
    .orderBy(desc(promptResponses.createdAt))
    .limit(limit);

  return rows as ReplyActivityRow[];
}
