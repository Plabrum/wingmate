import type { DBOrTx } from '../../db/client.ts';
import { decisions, profileReports } from '../../db/schema.ts';

export async function insertReport(
  db: DBOrTx,
  reporterId: string,
  reportedId: string,
  reason: string,
): Promise<void> {
  await db.insert(profileReports).values({ reporterId, reportedId, reason });
}

export async function upsertDeclineDecision(
  db: DBOrTx,
  actorId: string,
  recipientId: string,
): Promise<void> {
  await db
    .insert(decisions)
    .values({ actorId, recipientId, decision: 'declined' })
    .onConflictDoUpdate({
      target: [decisions.actorId, decisions.recipientId],
      set: { decision: 'declined' },
    });
}
