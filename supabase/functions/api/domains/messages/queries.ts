import { and, asc, eq, ne, or, sql } from 'drizzle-orm';
import type { DBOrTx } from '../../db/client.ts';
import { matches, messages, profiles } from '../../db/schema.ts';
import type { ConversationRow, MessageRow } from './transformers.ts';

export async function fetchPushToken(db: DBOrTx, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ push_token: profiles.pushToken })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.push_token ?? null;
}

export async function isViewerInMatch(
  db: DBOrTx,
  viewerId: string,
  matchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.id, matchId),
        or(eq(matches.userAId, viewerId), eq(matches.userBId, viewerId)),
      ),
    )
    .limit(1);
  return row != null;
}

export async function getMatchPeers(
  db: DBOrTx,
  matchId: string,
): Promise<{ userAId: string; userBId: string } | null> {
  const [row] = await db
    .select({ userAId: matches.userAId, userBId: matches.userBId })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  return row ?? null;
}

export async function fetchMessagesForMatch(
  db: DBOrTx,
  matchId: string,
  limit: number,
  offset: number,
): Promise<MessageRow[]> {
  const rows = await db
    .select({
      id: messages.id,
      match_id: messages.matchId,
      sender_id: messages.senderId,
      body: messages.body,
      is_read: messages.isRead,
      created_at: messages.createdAt,
      sender_chosen_name: profiles.chosenName,
    })
    .from(messages)
    .leftJoin(profiles, eq(profiles.id, messages.senderId))
    .where(eq(messages.matchId, matchId))
    .orderBy(asc(messages.createdAt))
    .limit(limit)
    .offset(offset);
  return rows as MessageRow[];
}

export async function fetchConversations(
  db: DBOrTx,
  viewerId: string,
): Promise<ConversationRow[]> {
  const otherIdExpr = sql<string>`case when ${matches.userAId} = ${viewerId} then ${matches.userBId} else ${matches.userAId} end`;

  const lastMessageIdExpr = sql<string | null>`(
    select ${messages.id} from ${messages}
    where ${messages.matchId} = ${matches.id}
    order by ${messages.createdAt} desc
    limit 1
  )`;
  const lastMessageBodyExpr = sql<string | null>`(
    select ${messages.body} from ${messages}
    where ${messages.matchId} = ${matches.id}
    order by ${messages.createdAt} desc
    limit 1
  )`;
  const lastMessageSenderIdExpr = sql<string | null>`(
    select ${messages.senderId} from ${messages}
    where ${messages.matchId} = ${matches.id}
    order by ${messages.createdAt} desc
    limit 1
  )`;
  const lastMessageIsReadExpr = sql<boolean | null>`(
    select ${messages.isRead} from ${messages}
    where ${messages.matchId} = ${matches.id}
    order by ${messages.createdAt} desc
    limit 1
  )`;
  const lastMessageCreatedAtExpr = sql<string | null>`(
    select ${messages.createdAt} from ${messages}
    where ${messages.matchId} = ${matches.id}
    order by ${messages.createdAt} desc
    limit 1
  )`;

  const unreadCountExpr = sql<number>`(
    select count(*)::int from ${messages}
    where ${messages.matchId} = ${matches.id}
      and ${messages.senderId} <> ${viewerId}
      and ${messages.isRead} = false
  )`;

  const orderExpr = sql`coalesce(
    (select ${messages.createdAt} from ${messages}
     where ${messages.matchId} = ${matches.id}
     order by ${messages.createdAt} desc
     limit 1),
    ${matches.createdAt}
  ) desc`;

  const rows = await db
    .select({
      match_id: matches.id,
      match_created_at: matches.createdAt,
      other_user_id: otherIdExpr.as('other_user_id'),
      other_chosen_name: profiles.chosenName,
      last_message_id: lastMessageIdExpr.as('last_message_id'),
      last_message_body: lastMessageBodyExpr.as('last_message_body'),
      last_message_sender_id: lastMessageSenderIdExpr.as('last_message_sender_id'),
      last_message_is_read: lastMessageIsReadExpr.as('last_message_is_read'),
      last_message_created_at: lastMessageCreatedAtExpr.as('last_message_created_at'),
      unread_count: unreadCountExpr.as('unread_count'),
    })
    .from(matches)
    .leftJoin(
      profiles,
      sql`${profiles.id} = case when ${matches.userAId} = ${viewerId} then ${matches.userBId} else ${matches.userAId} end`,
    )
    .where(or(eq(matches.userAId, viewerId), eq(matches.userBId, viewerId)))
    .orderBy(orderExpr);

  return rows as ConversationRow[];
}

export async function insertMessage(
  db: DBOrTx,
  matchId: string,
  senderId: string,
  body: string,
): Promise<MessageRow> {
  const [inserted] = await db
    .insert(messages)
    .values({ matchId, senderId, body })
    .returning({
      id: messages.id,
      match_id: messages.matchId,
      sender_id: messages.senderId,
      body: messages.body,
      is_read: messages.isRead,
      created_at: messages.createdAt,
    });

  const [senderRow] = await db
    .select({ chosen_name: profiles.chosenName })
    .from(profiles)
    .where(eq(profiles.id, senderId))
    .limit(1);

  return {
    ...inserted,
    sender_chosen_name: senderRow?.chosen_name ?? null,
  } as MessageRow;
}

export async function markMessagesRead(
  db: DBOrTx,
  matchId: string,
  viewerId: string,
): Promise<{ updated: number }> {
  const rows = await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.matchId, matchId),
        eq(messages.isRead, false),
        ne(messages.senderId, viewerId),
      ),
    )
    .returning({ id: messages.id });
  return { updated: rows.length };
}

