import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { DBOrTx } from '../../db/client.ts';
import { decisions, profiles } from '../../db/schema.ts';
import type { WingerTabRow } from './transformers.ts';

export async function fetchWingerTabs(
  db: DBOrTx,
  daterId: string,
): Promise<WingerTabRow[]> {
  const rows = await db
    .select({
      id: profiles.id,
      chosen_name: profiles.chosenName,
      created_at: decisions.createdAt,
    })
    .from(decisions)
    .innerJoin(profiles, eq(profiles.id, decisions.suggestedBy))
    .where(
      and(
        eq(decisions.actorId, daterId),
        isNull(decisions.decision),
        isNotNull(decisions.suggestedBy),
      ),
    )
    .orderBy(desc(decisions.createdAt));

  return rows as WingerTabRow[];
}
