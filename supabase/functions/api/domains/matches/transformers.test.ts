import { assertEquals } from '@std/assert';
import {
  buildMatchSheet,
  rowToMatch,
  rowToMatchPrompt,
  rowToWingNote,
  type MatchPromptRow,
  type MatchRow,
  type WingNoteRow,
} from './transformers.ts';

const BASE_MATCH_ROW: MatchRow = {
  match_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  created_at: '2026-01-01T00:00:00Z',
  has_messages: false,
  other_user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  chosen_name: 'Alex',
  date_of_birth: '1995-06-15',
  age: 30,
  city: 'New York',
  bio: 'Love hiking',
  interests: ['Outdoors', 'Cooking'],
  first_photo: 'https://example.com/photo.jpg',
};

Deno.test('rowToMatch maps all fields correctly', () => {
  const result = rowToMatch(BASE_MATCH_ROW);
  assertEquals(result.matchId, BASE_MATCH_ROW.match_id);
  assertEquals(result.createdAt, BASE_MATCH_ROW.created_at);
  assertEquals(result.hasMessages, false);
  assertEquals(result.other.id, BASE_MATCH_ROW.other_user_id);
  assertEquals(result.other.chosenName, 'Alex');
  assertEquals(result.other.city, 'New York');
  assertEquals(result.other.interests, ['Outdoors', 'Cooking']);
  assertEquals(result.other.firstPhoto, 'https://example.com/photo.jpg');
});

Deno.test('rowToMatch uses empty array when interests is null', () => {
  const row: MatchRow = { ...BASE_MATCH_ROW, interests: null };
  const result = rowToMatch(row);
  assertEquals(result.other.interests, []);
});

Deno.test('rowToWingNote returns null when row is null', () => {
  assertEquals(rowToWingNote(null), null);
});

Deno.test('rowToWingNote returns null when note is null', () => {
  const row: WingNoteRow = {
    note: null,
    suggested_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    winger_id: null,
    winger_chosen_name: null,
  };
  assertEquals(rowToWingNote(row), null);
});

Deno.test('rowToWingNote maps note and winger', () => {
  const row: WingNoteRow = {
    note: 'Great match!',
    suggested_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    winger_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    winger_chosen_name: 'Sam',
  };
  const result = rowToWingNote(row);
  assertEquals(result?.note, 'Great match!');
  assertEquals(result?.suggestedBy, 'cccccccc-cccc-cccc-cccc-cccccccccccc');
  assertEquals(result?.winger?.chosenName, 'Sam');
});

Deno.test('rowToWingNote sets winger null when winger_id is null', () => {
  const row: WingNoteRow = {
    note: 'Nice person',
    suggested_by: null,
    winger_id: null,
    winger_chosen_name: null,
  };
  const result = rowToWingNote(row);
  assertEquals(result?.note, 'Nice person');
  assertEquals(result?.winger, null);
});

Deno.test('rowToMatchPrompt maps prompt with template', () => {
  const row: MatchPromptRow = {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    answer: 'I love sunsets',
    template_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    template_question: 'What is your favourite time of day?',
  };
  const result = rowToMatchPrompt(row);
  assertEquals(result.id, row.id);
  assertEquals(result.answer, 'I love sunsets');
  assertEquals(result.template?.id, row.template_id);
  assertEquals(result.template?.question, 'What is your favourite time of day?');
});

Deno.test('rowToMatchPrompt sets template null when template_id is null', () => {
  const row: MatchPromptRow = {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    answer: 'No template',
    template_id: null,
    template_question: null,
  };
  const result = rowToMatchPrompt(row);
  assertEquals(result.template, null);
});

Deno.test('buildMatchSheet assembles wingNote and prompts', () => {
  const wingNoteRow: WingNoteRow = {
    note: 'They are great',
    suggested_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    winger_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    winger_chosen_name: 'Sam',
  };
  const promptRows: MatchPromptRow[] = [
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      answer: 'Answer A',
      template_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      template_question: 'Question?',
    },
  ];
  const result = buildMatchSheet(wingNoteRow, promptRows);
  assertEquals(result.wingNote?.note, 'They are great');
  assertEquals(result.prompts.length, 1);
  assertEquals(result.prompts[0].answer, 'Answer A');
});

Deno.test('buildMatchSheet returns null wingNote when note row is null', () => {
  const result = buildMatchSheet(null, []);
  assertEquals(result.wingNote, null);
  assertEquals(result.prompts, []);
});
