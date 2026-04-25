import type { Match, PendingSuggestion } from './schemas.ts';

export type MatchRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
};

export function rowToMatch(row: MatchRow): Match {
  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    createdAt: row.created_at,
  };
}

export type PendingSuggestionRow = {
  id: string;
  recipient_id: string;
  note: string | null;
  created_at: string;
  winger_id: string | null;
  winger_name: string | null;
};

export function rowToPendingSuggestion(row: PendingSuggestionRow): PendingSuggestion {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    note: row.note,
    createdAt: row.created_at,
    wingerId: row.winger_id,
    wingerName: row.winger_name,
  };
}
