import { and, asc, eq, sql } from 'drizzle-orm';
import type { DBOrTx } from '../../db/client.ts';
import { contacts, datingProfiles, profilePhotos, profiles } from '../../db/schema.ts';
import type { PhotoRow } from './transformers.ts';

const photoSelection = {
  id: profilePhotos.id,
  dating_profile_id: profilePhotos.datingProfileId,
  storage_url: profilePhotos.storageUrl,
  display_order: profilePhotos.displayOrder,
  approved_at: profilePhotos.approvedAt,
  suggester_id: profilePhotos.suggesterId,
  suggester_name: profiles.chosenName,
};

export async function fetchOwnPhotos(db: DBOrTx, userId: string): Promise<PhotoRow[]> {
  const rows = await db
    .select(photoSelection)
    .from(profilePhotos)
    .innerJoin(datingProfiles, eq(datingProfiles.id, profilePhotos.datingProfileId))
    .leftJoin(profiles, eq(profiles.id, profilePhotos.suggesterId))
    .where(eq(datingProfiles.userId, userId))
    .orderBy(asc(profilePhotos.displayOrder));
  return rows as PhotoRow[];
}

export async function fetchPhotoIfOwned(
  db: DBOrTx,
  photoId: string,
  ownerId: string,
): Promise<PhotoRow | null> {
  const [row] = await db
    .select(photoSelection)
    .from(profilePhotos)
    .innerJoin(datingProfiles, eq(datingProfiles.id, profilePhotos.datingProfileId))
    .leftJoin(profiles, eq(profiles.id, profilePhotos.suggesterId))
    .where(and(eq(profilePhotos.id, photoId), eq(datingProfiles.userId, ownerId)))
    .limit(1);
  return (row as PhotoRow | undefined) ?? null;
}

export async function fetchDatingProfileOwner(
  db: DBOrTx,
  datingProfileId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ user_id: datingProfiles.userId })
    .from(datingProfiles)
    .where(eq(datingProfiles.id, datingProfileId))
    .limit(1);
  return row?.user_id ?? null;
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

export type InsertPhotoFields = {
  datingProfileId: string;
  storageUrl: string;
  displayOrder: number;
  suggesterId: string | null;
};

export async function insertPhoto(
  db: DBOrTx,
  fields: InsertPhotoFields,
): Promise<PhotoRow> {
  const [inserted] = await db
    .insert(profilePhotos)
    .values({
      datingProfileId: fields.datingProfileId,
      storageUrl: fields.storageUrl,
      displayOrder: fields.displayOrder,
      suggesterId: fields.suggesterId,
      approvedAt: fields.suggesterId === null ? sql`now()` : null,
    })
    .returning({ id: profilePhotos.id });

  const row = await fetchPhotoById(db, inserted.id);
  if (!row) throw new Error('Inserted photo not found');
  return row;
}

async function fetchPhotoById(db: DBOrTx, photoId: string): Promise<PhotoRow | null> {
  const [row] = await db
    .select(photoSelection)
    .from(profilePhotos)
    .leftJoin(profiles, eq(profiles.id, profilePhotos.suggesterId))
    .where(eq(profilePhotos.id, photoId))
    .limit(1);
  return (row as PhotoRow | undefined) ?? null;
}

export async function approveOwnedPhoto(
  db: DBOrTx,
  photoId: string,
  ownerId: string,
): Promise<PhotoRow | null> {
  const updated = await db
    .update(profilePhotos)
    .set({ approvedAt: sql`now()` })
    .where(
      and(
        eq(profilePhotos.id, photoId),
        sql`exists (select 1 from ${datingProfiles} where ${datingProfiles.id} = ${profilePhotos.datingProfileId} and ${datingProfiles.userId} = ${ownerId})`,
      ),
    )
    .returning({ id: profilePhotos.id });
  if (updated.length === 0) return null;
  return fetchPhotoById(db, photoId);
}

export async function deleteOwnedPhoto(
  db: DBOrTx,
  photoId: string,
  ownerId: string,
): Promise<{ deleted: boolean }> {
  const rows = await db
    .delete(profilePhotos)
    .where(
      and(
        eq(profilePhotos.id, photoId),
        sql`exists (select 1 from ${datingProfiles} where ${datingProfiles.id} = ${profilePhotos.datingProfileId} and ${datingProfiles.userId} = ${ownerId})`,
      ),
    )
    .returning({ id: profilePhotos.id });
  return { deleted: rows.length > 0 };
}

export async function reorderOwnedPhoto(
  db: DBOrTx,
  photoId: string,
  ownerId: string,
  displayOrder: number,
): Promise<PhotoRow | null> {
  const updated = await db
    .update(profilePhotos)
    .set({ displayOrder })
    .where(
      and(
        eq(profilePhotos.id, photoId),
        sql`exists (select 1 from ${datingProfiles} where ${datingProfiles.id} = ${profilePhotos.datingProfileId} and ${datingProfiles.userId} = ${ownerId})`,
      ),
    )
    .returning({ id: profilePhotos.id });
  if (updated.length === 0) return null;
  return fetchPhotoById(db, photoId);
}
