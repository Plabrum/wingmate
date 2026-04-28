import { and, desc, eq, exists, isNotNull, isNull, ne, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DBOrTx } from '../../db/client.ts';
import { datingProfiles, decisions, matches, profiles, profilePhotos } from '../../db/schema.ts';
import type { DiscoverRow } from './transformers.ts';

export type FetchDiscoverPoolParams = {
  viewerId: string;
  filterWingerId?: string;
  pageSize: number;
  pageOffset: number;
  wingerOnly?: true;
  likesYouOnly?: true;
};

export async function fetchDiscoverPool(
  db: DBOrTx,
  params: FetchDiscoverPoolParams,
): Promise<DiscoverRow[]> {
  const { viewerId, filterWingerId, pageSize, pageOffset, wingerOnly, likesYouOnly } = params;

  const vdp = alias(datingProfiles, 'vdp');
  const d = alias(decisions, 'd');
  const sug = alias(decisions, 'sug');
  const lk = alias(decisions, 'lk');

  const ageExpr = sql<number>`extract(year from age(${profiles.dateOfBirth}))::int`;

  const firstPhotoExpr = sql<string | null>`(
    select ${profilePhotos.storageUrl}
    from ${profilePhotos}
    where ${profilePhotos.datingProfileId} = ${datingProfiles.id}
      and ${profilePhotos.approvedAt} is not null
    order by ${profilePhotos.displayOrder}
    limit 1
  )`;

  const wingNoteExpr = sql<string | null>`(
    select ${decisions.note}
    from ${decisions}
    where ${decisions.actorId} = ${viewerId}
      and ${decisions.recipientId} = ${datingProfiles.userId}
      and ${decisions.decision} is null
      and ${decisions.suggestedBy} is not null
    limit 1
  )`;

  const suggestedByExpr = sql<string | null>`(
    select ${decisions.suggestedBy}
    from ${decisions}
    where ${decisions.actorId} = ${viewerId}
      and ${decisions.recipientId} = ${datingProfiles.userId}
      and ${decisions.decision} is null
      and ${decisions.suggestedBy} is not null
    limit 1
  )`;

  const suggesterNameExpr = sql<string | null>`(
    select ${profiles.chosenName}
    from ${decisions}
    join ${profiles} on ${profiles.id} = ${decisions.suggestedBy}
    where ${decisions.actorId} = ${viewerId}
      and ${decisions.recipientId} = ${datingProfiles.userId}
      and ${decisions.decision} is null
      and ${decisions.suggestedBy} is not null
    limit 1
  )`;

  const filters: Parameters<typeof and>[0][] = [
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
        .from(d)
        .where(
          and(
            eq(d.actorId, viewerId),
            eq(d.recipientId, datingProfiles.userId),
            isNotNull(d.decision),
          ),
        ),
    ),
  ];

  if (filterWingerId) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(sug)
          .where(
            and(
              eq(sug.actorId, viewerId),
              eq(sug.recipientId, datingProfiles.userId),
              eq(sug.suggestedBy, filterWingerId),
              isNull(sug.decision),
            ),
          ),
      ),
    );
  }

  if (wingerOnly) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(sug)
          .where(
            and(
              eq(sug.actorId, viewerId),
              eq(sug.recipientId, datingProfiles.userId),
              isNull(sug.decision),
              isNotNull(sug.suggestedBy),
            ),
          ),
      ),
    );
  }

  if (likesYouOnly) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(lk)
          .where(
            and(
              eq(lk.actorId, datingProfiles.userId),
              eq(lk.recipientId, viewerId),
              eq(lk.decision, 'approved'),
            ),
          ),
      ),
      notExists(
        db
          .select({ one: sql`1` })
          .from(matches)
          .where(
            or(
              and(eq(matches.userAId, viewerId), eq(matches.userBId, datingProfiles.userId)),
              and(eq(matches.userAId, datingProfiles.userId), eq(matches.userBId, viewerId)),
            ),
          ),
      ),
    );
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
      wing_note: wingNoteExpr.as('wing_note'),
      suggested_by: suggestedByExpr.as('suggested_by'),
      suggester_name: suggesterNameExpr.as('suggester_name'),
    })
    .from(datingProfiles)
    .innerJoin(profiles, eq(profiles.id, datingProfiles.userId))
    .innerJoin(vdp, eq(vdp.userId, viewerId))
    .where(and(...filters))
    .orderBy(desc(sql`(${suggestedByExpr} is not null)`), desc(datingProfiles.createdAt))
    .limit(pageSize)
    .offset(pageOffset);

  return rows as DiscoverRow[];
}
