import type { ActivityRow } from './schemas.ts';

export type SuggestionActivityRow = {
  id: string;
  decision: 'approved' | 'declined' | null;
  created_at: string;
  dater_id: string;
  dater_name: string;
  recipient_name: string;
  has_match: boolean;
};

export type ReplyActivityRow = {
  id: string;
  created_at: string;
  dater_id: string;
  dater_name: string;
  prompt_question: string;
  message: string;
};

function suggestionToRow(row: SuggestionActivityRow): ActivityRow {
  const kind: ActivityRow['kind'] =
    row.decision === 'declined'
      ? 'pass'
      : row.decision === 'approved' && row.has_match
        ? 'match'
        : 'sent';
  return {
    id: `suggestion:${row.id}`,
    kind,
    daterId: row.dater_id,
    daterName: row.dater_name,
    recipientName: row.recipient_name,
    promptQuestion: null,
    message: null,
    createdAt: row.created_at,
  };
}

function replyToRow(row: ReplyActivityRow): ActivityRow {
  return {
    id: `reply:${row.id}`,
    kind: 'reply',
    daterId: row.dater_id,
    daterName: row.dater_name,
    recipientName: null,
    promptQuestion: row.prompt_question,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function buildActivityFeed(
  suggestions: SuggestionActivityRow[],
  replies: ReplyActivityRow[],
  limit: number,
): ActivityRow[] {
  const rows: ActivityRow[] = [
    ...suggestions.map(suggestionToRow),
    ...replies.map(replyToRow),
  ];
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return rows.slice(0, limit);
}
