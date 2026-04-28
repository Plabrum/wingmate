import { assertEquals } from '@std/assert';
import { createTestApp, createDbMock } from '../../lib/test-helpers.ts';
import { mountMatches } from './route.ts';
import type { MatchRow, WingNoteRow, MatchPromptRow } from './transformers.ts';

const VIEWER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MATCH_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const MATCH_ROW: MatchRow = {
  match_id: MATCH_ID,
  created_at: '2026-01-01T00:00:00Z',
  has_messages: false,
  other_user_id: OTHER_ID,
  chosen_name: 'Alex',
  date_of_birth: '1995-06-15',
  age: 30,
  city: 'New York',
  bio: 'Love hiking',
  interests: ['Outdoors'],
  first_photo: null,
};

const WING_NOTE_ROW: WingNoteRow = {
  note: 'Great person',
  suggested_by: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  winger_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  winger_chosen_name: 'Sam',
};

const PROMPT_ROW: MatchPromptRow = {
  id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  answer: 'I love sunsets',
  template_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  template_question: 'What is your favourite time of day?',
};

function makeAuthHeader(userId = VIEWER_ID) {
  const payload = btoa(JSON.stringify({ sub: userId, iat: 0 }));
  return `Bearer header.${payload}.sig`;
}

Deno.test('GET /api/matches — returns 200 with mapped matches array', async () => {
  const app = createTestApp(mountMatches, {
    userId: VIEWER_ID,
    db: createDbMock([MATCH_ROW]),
  });

  const res = await app.request('/api/matches', {
    headers: { authorization: makeAuthHeader() },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(Array.isArray(body), true);
  assertEquals(body.length, 1);
  assertEquals(body[0].matchId, MATCH_ID);
  assertEquals(body[0].other.id, OTHER_ID);
  assertEquals(body[0].other.chosenName, 'Alex');
});

Deno.test('GET /api/matches — returns 200 with empty array', async () => {
  const app = createTestApp(mountMatches, {
    userId: VIEWER_ID,
    db: createDbMock([]),
  });

  const res = await app.request('/api/matches', {
    headers: { authorization: makeAuthHeader() },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, []);
});

// For the sheet route, the handler calls three queries sequentially:
// 1. fetchMatchOtherUserId → expects [{ other_user_id }] (takes [0])
// 2. fetchWingNoteForMatch → expects [row] (takes [0])
// 3. fetchPromptsForUser  → expects [row, ...]
// A stateful mock cycles through the results array on each .then() call.
// deno-lint-ignore no-explicit-any
function createSequentialDbMock(results: unknown[]): any {
  let callIndex = 0;
  // deno-lint-ignore no-explicit-any
  const makeProxy = (): any =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            const result = results[callIndex++] ?? undefined;
            return (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
          }
          if (prop === 'catch') return () => makeProxy();
          if (prop === 'finally') {
            return (fn: () => void) => {
              fn();
              return makeProxy();
            };
          }
          return () => makeProxy();
        },
      },
    );
  return makeProxy();
}

Deno.test('GET /api/matches/:matchId/sheet — returns 200 with sheet', async () => {
  // Query 1: fetchMatchOtherUserId → returns array (handler takes [0])
  // Query 2: fetchWingNoteForMatch → returns array (handler takes [0])
  // Query 3: fetchPromptsForUser   → returns array of prompt rows
  // Queries 2 & 3 run in Promise.all, so call order is 2 then 3.
  const db = createSequentialDbMock([
    [{ other_user_id: OTHER_ID }], // fetchMatchOtherUserId
    [WING_NOTE_ROW], // fetchWingNoteForMatch
    [PROMPT_ROW], // fetchPromptsForUser
  ]);

  const app = createTestApp(mountMatches, { userId: VIEWER_ID, db });

  const res = await app.request(`/api/matches/${MATCH_ID}/sheet`, {
    headers: { authorization: makeAuthHeader() },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.wingNote?.note, 'Great person');
  assertEquals(body.prompts.length, 1);
  assertEquals(body.prompts[0].answer, 'I love sunsets');
});

Deno.test('GET /api/matches/:matchId/sheet — returns 404 when match not found', async () => {
  // fetchMatchOtherUserId returns empty array → handler gets undefined → 404
  const app = createTestApp(mountMatches, {
    userId: VIEWER_ID,
    db: createDbMock([]),
  });

  const res = await app.request(`/api/matches/${MATCH_ID}/sheet`, {
    headers: { authorization: makeAuthHeader() },
  });

  assertEquals(res.status, 404);
});
