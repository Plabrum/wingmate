import { and, desc, eq, isNotNull, isNull, ne, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/client.ts';
import { datingProfiles, decisions, profiles, profilePhotos } from '../../db/schema.ts';
import type { DiscoverRow } from './transformers.ts';

export type FetchDiscoverPoolParams = {
  viewerId: string;
  filterWingerId?: string;
  pageSize: number;
  pageOffset: number;
  wingerOnly: boolean;
};

export async function fetchDiscoverPool(
  params: FetchDiscoverPoolParams,
): Promise<DiscoverRow[]> {
  const { viewerId, filterWingerId, pageSize, pageOffset, wingerOnly } = params;
  const vdp = alias(datingProfiles, 'vdp');
  const s = alias(profiles, 's');

  const ageExpr = sql<number>`extract(year from age(${profiles.dateOfBirth}))::int`;

  const firstPhotoExpr = sql<string | null>`(
    select ${profilePhotos.storageUrl}
    from ${profilePhotos}
    where ${profilePhotos.datingProfileId} = ${datingProfiles.id}
      and ${profilePhotos.approvedAt} is not null
    order by ${profilePhotos.displayOrder}
    limit 1
  )`;

  const suggestionJoinDecision = sql`${decisions.decision} is null`;
  const hasSuggestion = sql`${decisions.suggestedBy} is not null`;

  const filters = [
    eq(datingProfiles.isActive, true),
    eq(datingProfiles.datingStatus, 'open'),
    ne(datingProfiles.userId, viewerId),
    eq(datingProfiles.city, vdp.city),
    or(
      sql`${vdp.interestedGender} = '{}'::public.gender[]`,
      sql`${profiles.gender} = any(${vdp.interestedGender})`,
    ),
    sql`${ageExpr} >= ${vdp.ageFrom}`,
    or(isNull(vdp.ageTo), sql`${ageExpr} <= ${vdp.ageTo}`),
    or(
      isNull(vdp.religiousPreference),
      sql`${datingProfiles.religion} = ${vdp.religiousPreference}`,
    ),
    notExists(
      db
        .select({ one: sql`1` })
        .from(decisions)
        .where(
          and(
            eq(decisions.actorId, viewerId),
            eq(decisions.recipientId, datingProfiles.userId),
            isNotNull(decisions.decision),
          ),
        ),
    ),
    notExists(
      db
        .select({ one: sql`1` })
        .from(decisions)
        .where(
          and(
            eq(decisions.actorId, datingProfiles.userId),
            eq(decisions.recipientId, viewerId),
            eq(decisions.decision, 'approved'),
          ),
        ),
    ),
  ];

  if (filterWingerId) {
    filters.push(
      and(
        eq(decisions.suggestedBy, filterWingerId),
        isNull(decisions.decision),
      )!,
    );
  }

  if (wingerOnly) {
    filters.push(isNotNull(decisions.id));
  }

  const rows = await db
    .select({
      profile_id: datingProfiles.id,
      user_id: datingProfiles.userId,
      chosen_name: profiles.chosenName,
      gender: profiles.gender,
      age: ageExpr.as('age'),
      city: datingProfiles.city,
      bio: datingProfiles.bio,
      dating_status: datingProfiles.datingStatus,
      interests: datingProfiles.interests,
      first_photo: firstPhotoExpr.as('first_photo'),
      wing_note: decisions.note,
      suggested_by: decisions.suggestedBy,
      suggester_name: s.chosenName,
    })
    .from(datingProfiles)
    .innerJoin(profiles, eq(profiles.id, datingProfiles.userId))
    .innerJoin(vdp, eq(vdp.userId, viewerId))
    .leftJoin(
      decisions,
      and(
        eq(decisions.actorId, viewerId),
        eq(decisions.recipientId, datingProfiles.userId),
        suggestionJoinDecision,
        hasSuggestion,
      ),
    )
    .leftJoin(s, eq(s.id, decisions.suggestedBy))
    .where(and(...filters))
    .orderBy(desc(sql`(${decisions.id} is not null)`), desc(datingProfiles.createdAt))
    .limit(pageSize)
    .offset(pageOffset);

  return rows as DiscoverRow[];
}
