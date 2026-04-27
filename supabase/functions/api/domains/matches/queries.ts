import { and, asc, desc, eq, isNotNull, or, sql } from 'drizzle-orm';
import type { DBOrTx } from '../../db/client.ts';
import {
  datingProfiles,
  decisions,
  matches,
  messages,
  profilePhotos,
  profilePrompts,
  profiles,
  promptTemplates,
} from '../../db/schema.ts';
import type { MatchRow, WingNoteRow, MatchPromptRow } from './transformers.ts';

export async function fetchMatches(db: DBOrTx, viewerId: string): Promise<MatchRow[]> {
  const otherUserIdExpr = sql<string>`case when ${matches.userAId} = ${viewerId} then ${matches.userBId} else ${matches.userAId} end`;
  const ageExpr = sql<number | null>`case when ${profiles.dateOfBirth} is null then null else extract(year from age(${profiles.dateOfBirth}))::int end`;
  const firstPhotoExpr = sql<string | null>`(
    select ${profilePhotos.storageUrl}
    from ${profilePhotos}
    where ${profilePhotos.datingProfileId} = ${datingProfiles.id}
      and ${profilePhotos.approvedAt} is not null
    order by ${profilePhotos.displayOrder}
    limit 1
  )`;
  const hasMessagesExpr = sql<boolean>`exists (
    select 1 from ${messages} where ${messages.matchId} = ${matches.id}
  )`;

  const rows = await db
    .select({
      match_id: matches.id,
      created_at: matches.createdAt,
      has_messages: hasMessagesExpr.as('has_messages'),
      other_user_id: otherUserIdExpr.as('other_user_id'),
      chosen_name: profiles.chosenName,
      date_of_birth: profiles.dateOfBirth,
      age: ageExpr.as('age'),
      city: datingProfiles.city,
      bio: datingProfiles.bio,
      interests: datingProfiles.interests,
      first_photo: firstPhotoExpr.as('first_photo'),
    })
    .from(matches)
    .leftJoin(
      profiles,
      sql`${profiles.id} = case when ${matches.userAId} = ${viewerId} then ${matches.userBId} else ${matches.userAId} end`,
    )
    .leftJoin(datingProfiles, eq(datingProfiles.userId, profiles.id))
    .where(or(eq(matches.userAId, viewerId), eq(matches.userBId, viewerId)))
    .orderBy(desc(matches.createdAt));

  return rows as MatchRow[];
}

export async function fetchMatchOtherUserId(
  db: DBOrTx,
  viewerId: string,
  matchId: string,
): Promise<string | null> {
  const [row] = await db
    .select({
      other_user_id: sql<string>`case when ${matches.userAId} = ${viewerId} then ${matches.userBId} else ${matches.userAId} end`.as(
        'other_user_id',
      ),
    })
    .from(matches)
    .where(
      and(
        eq(matches.id, matchId),
        or(eq(matches.userAId, viewerId), eq(matches.userBId, viewerId)),
      ),
    )
    .limit(1);
  return row?.other_user_id ?? null;
}

export async function fetchWingNoteForMatch(
  db: DBOrTx,
  viewerId: string,
  otherUserId: string,
): Promise<WingNoteRow | null> {
  const [row] = await db
    .select({
      note: decisions.note,
      suggested_by: decisions.suggestedBy,
      winger_id: profiles.id,
      winger_chosen_name: profiles.chosenName,
    })
    .from(decisions)
    .leftJoin(profiles, eq(profiles.id, decisions.suggestedBy))
    .where(
      and(
        eq(decisions.actorId, viewerId),
        eq(decisions.recipientId, otherUserId),
        isNotNull(decisions.note),
      ),
    )
    .limit(1);
  return (row as WingNoteRow | undefined) ?? null;
}

export async function fetchPromptsForUser(
  db: DBOrTx,
  userId: string,
): Promise<MatchPromptRow[]> {
  const rows = await db
    .select({
      id: profilePrompts.id,
      answer: profilePrompts.answer,
      template_id: promptTemplates.id,
      template_question: promptTemplates.question,
    })
    .from(profilePrompts)
    .innerJoin(datingProfiles, eq(datingProfiles.id, profilePrompts.datingProfileId))
    .leftJoin(promptTemplates, eq(promptTemplates.id, profilePrompts.promptTemplateId))
    .where(eq(datingProfiles.userId, userId))
    .orderBy(asc(profilePrompts.createdAt));
  return rows as MatchPromptRow[];
}
