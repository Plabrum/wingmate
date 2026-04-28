import { assertEquals } from '@std/assert';
import { createTestApp, createDbMock } from '../../lib/test-helpers.ts';
import { mountDiscover } from './route.ts';
import type { DiscoverRow } from './transformers.ts';

const VIEWER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PROFILE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const WINGER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const BASE_ROW: DiscoverRow = {
  profile_id: PROFILE_ID,
  user_id: USER_ID,
  chosen_name: 'Alex',
  gender: 'Female',
  age: 28,
  city: 'New York',
  bio: 'Loves coffee',
  dating_status: 'open',
  interests: ['Outdoors', 'Food'],
  photos: ['https://example.com/photo.jpg'],
  wing_note: null,
  suggested_by: null,
  suggester_name: null,
};

const SUGGESTED_ROW: DiscoverRow = {
  ...BASE_ROW,
  wing_note: 'You two would vibe',
  suggested_by: WINGER_ID,
  suggester_name: 'Sam',
};

Deno.test('GET /api/discover — returns 200 with mapped profiles', async () => {
  const app = createTestApp(mountDiscover, {
    userId: VIEWER_ID,
    db: createDbMock([BASE_ROW]),
  });

  const res = await app.request('/api/discover', {
    headers: { authorization: `Bearer header.${btoa(JSON.stringify({ sub: VIEWER_ID }))}.sig` },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(Array.isArray(body), true);
  assertEquals(body.length, 1);
  assertEquals(body[0].profileId, PROFILE_ID);
  assertEquals(body[0].userId, USER_ID);
  assertEquals(body[0].chosenName, 'Alex');
  assertEquals(body[0].wingNote, null);
  assertEquals(body[0].suggestedBy, null);
});

Deno.test('GET /api/discover — returns 200 with empty array', async () => {
  const app = createTestApp(mountDiscover, {
    userId: VIEWER_ID,
    db: createDbMock([]),
  });

  const res = await app.request('/api/discover', {
    headers: { authorization: `Bearer header.${btoa(JSON.stringify({ sub: VIEWER_ID }))}.sig` },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body, []);
});

Deno.test('GET /api/discover — maps wing note and suggester when present', async () => {
  const app = createTestApp(mountDiscover, {
    userId: VIEWER_ID,
    db: createDbMock([SUGGESTED_ROW]),
  });

  const res = await app.request('/api/discover', {
    headers: { authorization: `Bearer header.${btoa(JSON.stringify({ sub: VIEWER_ID }))}.sig` },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body[0].wingNote, 'You two would vibe');
  assertEquals(body[0].suggestedBy, WINGER_ID);
  assertEquals(body[0].suggesterName, 'Sam');
});

Deno.test('GET /api/discover?likesYouOnly=true — passes through and maps results', async () => {
  const app = createTestApp(mountDiscover, {
    userId: VIEWER_ID,
    db: createDbMock([BASE_ROW]),
  });

  const res = await app.request('/api/discover?likesYouOnly=true', {
    headers: { authorization: `Bearer header.${btoa(JSON.stringify({ sub: VIEWER_ID }))}.sig` },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.length, 1);
  assertEquals(body[0].profileId, PROFILE_ID);
});

Deno.test('GET /api/discover?wingerOnly=true — passes through and maps results', async () => {
  const app = createTestApp(mountDiscover, {
    userId: VIEWER_ID,
    db: createDbMock([SUGGESTED_ROW]),
  });

  const res = await app.request('/api/discover?wingerOnly=true', {
    headers: { authorization: `Bearer header.${btoa(JSON.stringify({ sub: VIEWER_ID }))}.sig` },
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body[0].suggestedBy, WINGER_ID);
});
