import type {
  MatchSheet,
  MatchSheetPrompt,
  MatchSheetWingNote,
  MatchSummary,
  MatchSummaryOther,
} from './schemas.ts';

export type MatchRow = {
  match_id: string;
  created_at: string;
  has_messages: boolean;
  other_user_id: string;
  chosen_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  city: MatchSummaryOther['city'];
  bio: string | null;
  interests: MatchSummaryOther['interests'] | null;
  first_photo: string | null;
};

export type WingNoteRow = {
  note: string | null;
  suggested_by: string | null;
  winger_id: string | null;
  winger_chosen_name: string | null;
};

export type MatchPromptRow = {
  id: string;
  answer: string;
  template_id: string | null;
  template_question: string | null;
};

export function rowToMatch(row: MatchRow): MatchSummary {
  const other: MatchSummaryOther = {
    id: row.other_user_id,
    chosenName: row.chosen_name,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    city: row.city,
    bio: row.bio,
    interests: row.interests ?? [],
    firstPhoto: row.first_photo,
  };
  return {
    matchId: row.match_id,
    createdAt: row.created_at,
    hasMessages: row.has_messages,
    other,
  };
}

export function rowToWingNote(row: WingNoteRow | null): MatchSheetWingNote | null {
  if (!row || row.note == null) return null;
  return {
    note: row.note,
    suggestedBy: row.suggested_by,
    winger: row.winger_id
      ? { id: row.winger_id, chosenName: row.winger_chosen_name }
      : null,
  };
}

export function rowToMatchPrompt(row: MatchPromptRow): MatchSheetPrompt {
  return {
    id: row.id,
    answer: row.answer,
    template: row.template_id
      ? { id: row.template_id, question: row.template_question ?? '' }
      : null,
  };
}

export function buildMatchSheet(
  wingNoteRow: WingNoteRow | null,
  promptRows: MatchPromptRow[],
): MatchSheet {
  return {
    wingNote: rowToWingNote(wingNoteRow),
    prompts: promptRows.map(rowToMatchPrompt),
  };
}
