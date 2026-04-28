import type { Conversation, ConversationLastMessage, Message } from './schemas.ts';

export type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  sender_chosen_name: string | null;
};

export type ConversationRow = {
  match_id: string;
  match_created_at: string;
  other_user_id: string;
  other_chosen_name: string | null;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  last_message_is_read: boolean | null;
  last_message_created_at: string | null;
  unread_count: number;
};

export function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
    sender: { id: row.sender_id, chosenName: row.sender_chosen_name },
  };
}

function rowToLastMessage(row: ConversationRow): ConversationLastMessage | null {
  if (
    row.last_message_id == null ||
    row.last_message_body == null ||
    row.last_message_sender_id == null ||
    row.last_message_is_read == null ||
    row.last_message_created_at == null
  ) {
    return null;
  }
  return {
    id: row.last_message_id,
    body: row.last_message_body,
    senderId: row.last_message_sender_id,
    isRead: row.last_message_is_read,
    createdAt: new Date(row.last_message_created_at).toISOString(),
  };
}

export function rowToConversation(row: ConversationRow): Conversation {
  return {
    matchId: row.match_id,
    createdAt: row.match_created_at,
    other: { id: row.other_user_id, chosenName: row.other_chosen_name },
    lastMessage: rowToLastMessage(row),
    unreadCount: row.unread_count,
  };
}
