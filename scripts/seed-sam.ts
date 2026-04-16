#!/usr/bin/env npx tsx
/**
 * Seed Sam Taylor — a dater the dev user wings for.
 *
 * Creates:
 *   - Sam Taylor (dater, Female, interested in Male, NYC)
 *   - 3 prompts for Sam
 *   - 10 male potential match profiles Sam's winger can swipe through
 *   - Active contact linking dev@local.test as Sam's winger
 *
 * Usage (same env setup as db-fixtures.sh):
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   GOTRUE_JWT_KEYS="..." \
 *     npx tsx scripts/seed-sam.ts
 *
 * Or via npm: npm run seed:sam
 */

import { createClient } from '@supabase/supabase-js';
import { createPrivateKey } from 'crypto';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const GOTRUE_JWT_KEYS = process.env.GOTRUE_JWT_KEYS;
const GOTRUE_JWT_SECRET = process.env.GOTRUE_JWT_SECRET;

function makeServiceRoleJwt(): string {
  const claims = {
    iss: 'supabase-demo',
    role: 'service_role',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  if (GOTRUE_JWT_KEYS) {
    const jwks: { alg: string; kid?: string; d?: string }[] = JSON.parse(GOTRUE_JWT_KEYS);
    const jwk = jwks.find((k) => k.d);
    if (!jwk) throw new Error('No private key found in GOTRUE_JWT_KEYS');
    const privateKey = createPrivateKey({
      format: 'jwk',
      key: jwk as Parameters<typeof createPrivateKey>[0] & object,
    });
    return jwt.sign(claims, privateKey, { algorithm: 'ES256', keyid: jwk.kid });
  }

  if (GOTRUE_JWT_SECRET) {
    return jwt.sign(claims, GOTRUE_JWT_SECRET, { algorithm: 'HS256' });
  }

  throw new Error('Neither GOTRUE_JWT_KEYS nor GOTRUE_JWT_SECRET is set.');
}

const serviceRoleJwt = makeServiceRoleJwt();
const supabase = createClient(SUPABASE_URL, serviceRoleJwt, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Sam's prompts ─────────────────────────────────────────────────────────────

const SAM_PROMPTS: { question: string; answer: string }[] = [
  {
    question: 'A perfect Sunday looks like…',
    answer:
      'a slow morning run along the Hudson, eggs somewhere with too-good coffee, then zero plans.',
  },
  {
    question: "I'm looking for someone who…",
    answer: "is curious about the world and doesn't pretend to have it all figured out.",
  },
  {
    question: 'My friends would describe me as…',
    answer: 'the one who actually makes a reservation — and then talks everyone into a detour.',
  },
];

// ── Potential matches (men) for Sam ──────────────────────────────────────────

const SAM_MATCHES: {
  first: string;
  last: string;
  bio: string;
  interests: string[];
  religion: string;
  photoIndex: number;
}[] = [
  {
    first: 'Marcus',
    last: 'Webb',
    bio: 'Architecture nerd who will stop mid-walk to stare at a building. Zero apologies.',
    interests: ['Art', 'Travel', 'Food'],
    religion: 'Agnostic',
    photoIndex: 10,
  },
  {
    first: 'Daniel',
    last: 'Okafor',
    bio: 'Jazz bars and dive bars — ideally the same bar on the same night.',
    interests: ['Music', 'Food', 'Outdoors'],
    religion: 'Christian',
    photoIndex: 15,
  },
  {
    first: 'Tyler',
    last: 'Brennan',
    bio: 'I make really good playlists. This is not a small thing.',
    interests: ['Music', 'Movies', 'Gaming'],
    religion: 'Atheist',
    photoIndex: 20,
  },
  {
    first: 'Raj',
    last: 'Iyer',
    bio: 'Home cook who takes the farmers market too seriously. Farmer-market receipts available on request.',
    interests: ['Cooking', 'Travel', 'Books'],
    religion: 'Hindu',
    photoIndex: 25,
  },
  {
    first: 'Cole',
    last: 'Nakamura',
    bio: 'Will beat you at trivia night and apologize about it the whole way home.',
    interests: ['Books', 'Technology', 'Fitness'],
    religion: 'Agnostic',
    photoIndex: 30,
  },
  {
    first: 'Leo',
    last: 'Ferreira',
    bio: 'Ran the NYC Marathon once. Now I only run for the brunch at the finish line.',
    interests: ['Fitness', 'Food', 'Travel'],
    religion: 'Other',
    photoIndex: 35,
  },
  {
    first: 'Finn',
    last: "O'Sullivan",
    bio: 'True crime podcast listener who is, paradoxically, very optimistic about people.',
    interests: ['Books', 'Movies', 'Outdoors'],
    religion: 'Atheist',
    photoIndex: 40,
  },
  {
    first: 'Andre',
    last: 'Moreau',
    bio: 'Moved here from Montreal. The bagels are different but the energy is worth it.',
    interests: ['Food', 'Art', 'Dance'],
    religion: 'Agnostic',
    photoIndex: 45,
  },
  {
    first: 'Kai',
    last: 'Hoffman',
    bio: 'My ideal Saturday: bike ride along the Hudson, good coffee, no plans after noon.',
    interests: ['Outdoors', 'Photography', 'Fitness'],
    religion: 'Atheist',
    photoIndex: 50,
  },
  {
    first: 'Miles',
    last: 'Ashford',
    bio: 'Amateur stand-up comic. My friends laugh at me, not with me — close enough.',
    interests: ['Movies', 'Music', 'Food'],
    religion: 'Jewish',
    photoIndex: 55,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomDob(minAge: number, maxAge: number): string {
  const now = new Date();
  const year = now.getFullYear() - minAge - Math.floor(Math.random() * (maxAge - minAge + 1));
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getOrCreateUser(
  email: string,
  label: string
): Promise<{ id: string; existed: boolean }> {
  const { data: listData, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);

  const existing = listData.users.find((u) => u.email === email);
  if (existing) return { id: existing.id, existed: true };

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'Orbit123!',
    email_confirm: true,
  });
  if (authError) throw new Error(`${label} auth error: ${authError.message}`);
  return { id: authData.user.id, existed: false };
}

// ── Sam Taylor ────────────────────────────────────────────────────────────────

async function ensureSamTaylor(): Promise<string> {
  const email = 'sam.taylor@seed.orbit.test';
  const { id: userId, existed } = await getOrCreateUser(email, 'Sam Taylor');

  if (existed) {
    console.log('  Sam Taylor already exists, skipping creation');
    return userId;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      chosen_name: 'Sam',
      last_name: 'Taylor',
      gender: 'Female',
      date_of_birth: randomDob(25, 30),
      role: 'dater',
      phone_number: '+15550020001',
    })
    .eq('id', userId);
  if (profileError) throw new Error(`Sam profile error: ${profileError.message}`);

  const { data: dp, error: dpError } = await supabase
    .from('dating_profiles')
    .insert({
      user_id: userId,
      bio: 'Brooklyn native, always hunting for the best bagel in the borough. Big on live music and even bigger on people who can keep up with a 9pm whim.',
      interested_gender: ['Male'],
      age_from: 25,
      age_to: 38,
      religion: 'Agnostic',
      interests: ['Music', 'Outdoors', 'Food', 'Travel', 'Art'],
      city: 'New York',
      is_active: true,
      dating_status: 'winging',
    })
    .select('id')
    .single();
  if (dpError) throw new Error(`Sam dating_profile error: ${dpError.message}`);

  // Add prompts
  const { data: templates } = await supabase.from('prompt_templates').select('id, question');

  if (templates) {
    const rows = SAM_PROMPTS.flatMap(({ question, answer }) => {
      const template = templates.find((t) => t.question === question);
      if (!template) {
        console.warn(`  prompt template not found: "${question}" — skipping`);
        return [];
      }
      return [{ dating_profile_id: dp.id, prompt_template_id: template.id, answer }];
    });

    if (rows.length > 0) {
      const { error: promptError } = await supabase.from('profile_prompts').insert(rows);
      if (promptError) throw new Error(`Sam prompts error: ${promptError.message}`);
      console.log(`  inserted ${rows.length} prompts for Sam`);
    }
  }

  // Add a photo
  const { error: photoError } = await supabase.from('profile_photos').insert({
    dating_profile_id: dp.id,
    storage_url: `https://randomuser.me/api/portraits/women/5.jpg`,
    display_order: 0,
    approved_at: new Date().toISOString(),
  });
  if (photoError) throw new Error(`Sam photo error: ${photoError.message}`);

  console.log(`  Sam Taylor created (${userId})`);
  return userId;
}

// ── Potential match profiles ──────────────────────────────────────────────────

async function ensureMatchProfile(
  index: number,
  first: string,
  last: string,
  bio: string,
  interests: string[],
  religion: string,
  photoIndex: number
): Promise<void> {
  const email = `sam.match.${first.toLowerCase()}.${last.toLowerCase()}@seed.orbit.test`;
  const label = `${first} ${last}`;
  const { id: userId, existed } = await getOrCreateUser(email, label);

  if (existed) {
    console.log(`  ${label} already exists, skipping`);
    return;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      chosen_name: first,
      last_name: last,
      date_of_birth: randomDob(25, 35),
      gender: 'Male',
      role: 'dater',
      phone_number: `+1555002${String(index + 10).padStart(4, '0')}`,
    })
    .eq('id', userId);
  if (profileError) throw new Error(`${label} profile error: ${profileError.message}`);

  const { data: dp, error: dpError } = await supabase
    .from('dating_profiles')
    .insert({
      user_id: userId,
      bio,
      interested_gender: ['Female'],
      age_from: 23,
      age_to: 38,
      religion,
      interests,
      city: 'New York',
      is_active: true,
      dating_status: 'open',
    })
    .select('id')
    .single();
  if (dpError) throw new Error(`${label} dating_profile error: ${dpError.message}`);

  await supabase.from('profile_photos').insert([
    {
      dating_profile_id: dp.id,
      storage_url: `https://randomuser.me/api/portraits/men/${photoIndex % 99}.jpg`,
      display_order: 0,
      approved_at: new Date().toISOString(),
    },
    {
      dating_profile_id: dp.id,
      storage_url: `https://randomuser.me/api/portraits/men/${(photoIndex + 20) % 99}.jpg`,
      display_order: 1,
      approved_at: new Date().toISOString(),
    },
  ]);

  console.log(`  ${label} ✓`);
}

// ── Winger contact ────────────────────────────────────────────────────────────

async function linkDevUserAsWinger(samId: string): Promise<void> {
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const devUser = listData?.users.find((u) => u.email === 'dev@local.test');
  if (!devUser) {
    console.log('  dev@local.test not found — run npm run db:fixtures first');
    return;
  }

  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', samId)
    .eq('winger_id', devUser.id)
    .maybeSingle();

  if (existing) {
    console.log('  winger contact already exists, skipping');
    return;
  }

  const { error } = await supabase.from('contacts').insert({
    user_id: samId,
    winger_id: devUser.id,
    phone_number: '+15550020001',
    wingperson_status: 'active',
  });
  if (error) throw new Error(`contact error: ${error.message}`);

  console.log(`  dev user linked as Sam's winger ✓`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Seeding Sam Taylor…\n');

  console.log('Creating Sam Taylor (dater)…');
  const samId = await ensureSamTaylor();
  console.log();

  console.log('Creating potential match profiles for Sam…');
  for (let i = 0; i < SAM_MATCHES.length; i++) {
    const m = SAM_MATCHES[i];
    await ensureMatchProfile(i, m.first, m.last, m.bio, m.interests, m.religion, m.photoIndex);
  }
  console.log();

  console.log("Linking dev user as Sam's winger…");
  await linkDevUserAsWinger(samId);

  console.log('\nDone. Sam Taylor is seeded and ready for the winger flow.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
