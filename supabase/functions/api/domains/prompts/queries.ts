import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { DBOrTx } from '../../db/client.ts';
import {
  contacts,
  datingProfiles,
  matches,
  profilePrompts,
  profiles,
  promptResponses,
  promptTemplates,
} from '../../db/schema.ts';
import type {
  ProfilePromptRow,
  PromptResponseRow,
  PromptTemplateRow,
} from './transformers.ts';

// ── Templates ────────────────────────────────────────────────────────────────

export async function fetchPromptTemplates(db: DBOrTx): Promise<PromptTemplateRow[]> {
  const rows = await db
    .select({ id: promptTemplates.id, question: promptTemplates.question })
    .from(promptTemplates)
    .orderBy(asc(promptTemplates.question));
  return rows;
}

export async function fetchOnboardingPromptTemplates(
  db: DBOrTx,
  count: number,
): Promise<PromptTemplateRow[]> {
  const rows = await db
    .select({ id: promptTemplates.id, question: promptTemplates.question })
    .from(promptTemplates)
    .orderBy(sql`random()`)
    .limit(count);
  return rows;
}

// ── Profile prompts ──────────────────────────────────────────────────────────

const profilePromptSelection = {
  id: profilePrompts.id,
  dating_profile_id: profilePrompts.datingProfileId,
  answer: profilePrompts.answer,
  created_at: profilePrompts.createdAt,
  template_id: promptTemplates.id,
  template_question: promptTemplates.question,
};

export async function fetchOwnDatingProfileId(
  db: DBOrTx,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: datingProfiles.id })
    .from(datingProfiles)
    .where(eq(datingProfiles.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

export async function fetchOwnProfilePrompts(
  db: DBOrTx,
  userId: string,
): Promise<{ prompts: ProfilePromptRow[]; responses: PromptResponseRow[] }> {
  const prompts = await db
    .select(profilePromptSelection)
    .from(profilePrompts)
    .innerJoin(datingProfiles, eq(datingProfiles.id, profilePrompts.datingProfileId))
    .innerJoin(promptTemplates, eq(promptTemplates.id, profilePrompts.promptTemplateId))
    .where(eq(datingProfiles.userId, userId))
    .orderBy(asc(profilePrompts.createdAt));

  const promptRows = prompts as ProfilePromptRow[];
  if (promptRows.length === 0) return { prompts: promptRows, responses: [] };

  const responses = await db
    .select({
      id: promptResponses.id,
      profile_prompt_id: promptResponses.profilePromptId,
      message: promptResponses.message,
      is_approved: promptResponses.isApproved,
      user_id: promptResponses.userId,
      created_at: promptResponses.createdAt,
      author_id: profiles.id,
      author_name: profiles.chosenName,
      author_avatar_url: profiles.avatarUrl,
    })
    .from(promptResponses)
    .leftJoin(profiles, eq(profiles.id, promptResponses.userId))
    .where(
      inArray(
        promptResponses.profilePromptId,
        promptRows.map((p) => p.id),
      ),
    )
    .orderBy(asc(promptResponses.createdAt));
  return { prompts: promptRows, responses: responses as PromptResponseRow[] };
}

export async function insertProfilePrompt(
  db: DBOrTx,
  datingProfileId: string,
  promptTemplateId: string,
  answer: string,
): Promise<ProfilePromptRow> {
  const [inserted] = await db
    .insert(profilePrompts)
    .values({ datingProfileId, promptTemplateId, answer })
    .returning({ id: profilePrompts.id });

  const [row] = await db
    .select(profilePromptSelection)
    .from(profilePrompts)
    .innerJoin(promptTemplates, eq(promptTemplates.id, profilePrompts.promptTemplateId))
    .where(eq(profilePrompts.id, inserted.id))
    .limit(1);
  if (!row) throw new Error('Inserted profile prompt not found');
  return row as ProfilePromptRow;
}

export async function deleteOwnedProfilePrompt(
  db: DBOrTx,
  profilePromptId: string,
  ownerId: string,
): Promise<{ deleted: boolean }> {
  const rows = await db
    .delete(profilePrompts)
    .where(
      and(
        eq(profilePrompts.id, profilePromptId),
        sql`exists (select 1 from ${datingProfiles} where ${datingProfiles.id} = ${profilePrompts.datingProfileId} and ${datingProfiles.userId} = ${ownerId})`,
      ),
    )
    .returning({ id: profilePrompts.id });
  return { deleted: rows.length > 0 };
}

// ── Prompt responses ─────────────────────────────────────────────────────────

export async function fetchProfilePromptOwner(
  db: DBOrTx,
  profilePromptId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ owner_id: datingProfiles.userId })
    .from(profilePrompts)
    .innerJoin(datingProfiles, eq(datingProfiles.id, profilePrompts.datingProfileId))
    .where(eq(profilePrompts.id, profilePromptId))
    .limit(1);
  return row?.owner_id ?? null;
}

export async function isActiveWingperson(
  db: DBOrTx,
  daterId: string,
  wingerId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, daterId),
        eq(contacts.wingerId, wingerId),
        eq(contacts.wingpersonStatus, 'active'),
      ),
    )
    .limit(1);
  return row != null;
}

export async function isMatchedWith(
  db: DBOrTx,
  viewerId: string,
  otherUserId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      or(
        and(eq(matches.userAId, viewerId), eq(matches.userBId, otherUserId)),
        and(eq(matches.userAId, otherUserId), eq(matches.userBId, viewerId)),
      ),
    )
    .limit(1);
  return row != null;
}

const promptResponseSelection = {
  id: promptResponses.id,
  profile_prompt_id: promptResponses.profilePromptId,
  message: promptResponses.message,
  is_approved: promptResponses.isApproved,
  user_id: promptResponses.userId,
  created_at: promptResponses.createdAt,
  author_id: profiles.id,
  author_name: profiles.chosenName,
  author_avatar_url: profiles.avatarUrl,
};

async function fetchPromptResponseById(
  db: DBOrTx,
  responseId: string,
): Promise<PromptResponseRow | null> {
  const [row] = await db
    .select(promptResponseSelection)
    .from(promptResponses)
    .leftJoin(profiles, eq(profiles.id, promptResponses.userId))
    .where(eq(promptResponses.id, responseId))
    .limit(1);
  return (row as PromptResponseRow | undefined) ?? null;
}

export async function insertPromptResponse(
  db: DBOrTx,
  userId: string,
  profilePromptId: string,
  message: string,
): Promise<PromptResponseRow> {
  const [inserted] = await db
    .insert(promptResponses)
    .values({ userId, profilePromptId, message })
    .returning({ id: promptResponses.id });

  const row = await fetchPromptResponseById(db, inserted.id);
  if (!row) throw new Error('Inserted prompt response not found');
  return row;
}

export async function approveOwnedPromptResponse(
  db: DBOrTx,
  responseId: string,
  ownerId: string,
): Promise<PromptResponseRow | null> {
  const updated = await db
    .update(promptResponses)
    .set({ isApproved: true })
    .where(
      and(
        eq(promptResponses.id, responseId),
        sql`exists (
          select 1
          from ${profilePrompts}
          inner join ${datingProfiles} on ${datingProfiles.id} = ${profilePrompts.datingProfileId}
          where ${profilePrompts.id} = ${promptResponses.profilePromptId}
            and ${datingProfiles.userId} = ${ownerId}
        )`,
      ),
    )
    .returning({ id: promptResponses.id });
  if (updated.length === 0) return null;
  return fetchPromptResponseById(db, responseId);
}

export async function deletePromptResponseAsAuthorOrOwner(
  db: DBOrTx,
  responseId: string,
  callerId: string,
): Promise<{ deleted: boolean }> {
  const rows = await db
    .delete(promptResponses)
    .where(
      and(
        eq(promptResponses.id, responseId),
        or(
          eq(promptResponses.userId, callerId),
          sql`exists (
            select 1
            from ${profilePrompts}
            inner join ${datingProfiles} on ${datingProfiles.id} = ${profilePrompts.datingProfileId}
            where ${profilePrompts.id} = ${promptResponses.profilePromptId}
              and ${datingProfiles.userId} = ${callerId}
          )`,
        ),
      ),
    )
    .returning({ id: promptResponses.id });
  return { deleted: rows.length > 0 };
}
