import { and, desc, eq, isNotNull, isNull, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DBOrTx } from '../../db/client.ts';
import { datingProfiles, decisions, matches, profiles, profilePhotos } from '../../db/schema.ts';
import type { LikesYouRow } from './transformers.ts';

export type FetchLikesYouParams = {
  viewerId: string;
  pageSize: number;
  pageOffset: number;
};

type LikeAlias = ReturnType<typeof alias<typeof decisions, 'lk'>>;
type ViewerDpAlias = ReturnType<typeof alias<typeof datingProfiles, 'vdp'>>;

function buildLikesYouFilters(
  db: DBOrTx,
  viewerId: string,
  lk: LikeAlias,
  vdp: ViewerDpAlias,
) {
  const ageExpr = sql<number>`extract(year from age(${profiles.dateOfBirth}))::int`;

  return [
    eq(lk.recipientId, viewerId),
    eq(lk.decision, 'approved'),
    eq(datingProfiles.isActive, true),
    eq(datingProfiles.datingStatus, 'open'),
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
            eq(decisions.recipientId, lk.actorId),
            isNotNull(decisions.decision),
          ),
        ),
    ),
    notExists(
      db
        .select({ one: sql`1` })
        .from(matches)
        .where(
          or(
            and(eq(matches.userAId, viewerId), eq(matches.userBId, lk.actorId)),
            and(eq(matches.userAId, lk.actorId), eq(matches.userBId, viewerId)),
          ),
        ),
    ),
  ];
}

export async function fetchLikesYouPool(
  db: DBOrTx,
  params: FetchLikesYouParams,
): Promise<LikesYouRow[]> {
  const { viewerId, pageSize, pageOffset } = params;
  const lk = alias(decisions, 'lk');
  const vdp = alias(datingProfiles, 'vdp');
  const pendingSug = alias(decisions, 'pending_sug');
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

  const filters = buildLikesYouFilters(db, viewerId, lk, vdp);

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
      wing_note: pendingSug.note,
      suggested_by: pendingSug.suggestedBy,
      suggester_name: s.chosenName,
    })
    .from(lk)
    .innerJoin(profiles, eq(profiles.id, lk.actorId))
    .innerJoin(datingProfiles, eq(datingProfiles.userId, lk.actorId))
    .innerJoin(vdp, eq(vdp.userId, viewerId))
    .leftJoin(
      pendingSug,
      and(
        eq(pendingSug.actorId, viewerId),
        eq(pendingSug.recipientId, lk.actorId),
        isNull(pendingSug.decision),
        isNotNull(pendingSug.suggestedBy),
      ),
    )
    .leftJoin(s, eq(s.id, pendingSug.suggestedBy))
    .where(and(...filters))
    .orderBy(desc(lk.createdAt))
    .limit(pageSize)
    .offset(pageOffset);

  return rows as LikesYouRow[];
}

export async function fetchLikesYouCount(db: DBOrTx, viewerId: string): Promise<number> {
  const lk = alias(decisions, 'lk');
  const vdp = alias(datingProfiles, 'vdp');

  const filters = buildLikesYouFilters(db, viewerId, lk, vdp);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lk)
    .innerJoin(profiles, eq(profiles.id, lk.actorId))
    .innerJoin(datingProfiles, eq(datingProfiles.userId, lk.actorId))
    .innerJoin(vdp, eq(vdp.userId, viewerId))
    .where(and(...filters));

  return row?.count ?? 0;
}
