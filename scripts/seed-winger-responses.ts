#!/usr/bin/env npx tsx
/**
 * Seed prompt_responses from the dev user's wingers on their profile prompts.
 *
 * Each winger (Alex Chen, Jordan Kim, Sam Rivera) leaves a comment on each
 * of the dev user's prompts. Responses start unapproved so the dater sees
 * the "N wingperson comments waiting" flow in the Prompts tab.
 *
 * Usage: npm run seed:winger-responses
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

const supabase = createClient(SUPABASE_URL, makeServiceRoleJwt(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Winger responses keyed by prompt question ─────────────────────────────────

// Each question maps to one response per winger: [Alex, Jordan, Sam Rivera]
const RESPONSES_BY_QUESTION: Record<string, [string, string, string]> = {
  'The way to my heart is…': [
    'Can confirm — bring snacks and you have their full attention.',
    'This is 100% accurate. I have tested this theory.',
    "Honestly though, they mean it. Don't show up empty-handed.",
  ],
  'A perfect Sunday looks like…': [
    "They will genuinely not check their phone until 2pm. It's impressive.",
    'The farmers market thing is real. They know every vendor by name.',
    'Add "convincing everyone else to cancel their plans too" and this is perfect.',
  ],
  'My love language is…': [
    "I once watched them rearrange someone else's furniture unprompted. True story.",
    'They say quality time but they also just show up with your favorite snacks. Both.',
    'The quiet sitting together thing sounds boring until you experience it. It is not boring.',
  ],
  'I get way too excited about…': [
    'You think they are joking about this. They are not joking.',
    'I have received approximately 14 texts about new bakery openings in the last month.',
    'The parking spot thing — I was there. Celebration lasted longer than finding it.',
  ],
  "The most spontaneous thing I've done…": [
    'I heard about this trip 36 hours before departure. Zero hesitation.',
    'They did not pack enough socks. They do not regret a single thing.',
    'This is the most on-brand story I have ever heard about this person.',
  ],
  'Two truths and a lie…': [
    'I know which one is the lie and I am not telling you.',
    'Asked them and they refused to confirm. Part of the charm.',
    'I guessed wrong. Very embarrassing. Do better than me.',
  ],
  'My friends would describe me as…': [
    'Can confirm. They made the reservation for my birthday before I even mentioned it.',
    'The questions thing is real. Best conversation starter I know.',
    'Reliably late is generous. Worth the wait is accurate.',
  ],
  "I'm looking for someone who…": [
    'They will know within five minutes whether you meet this standard.',
    'The brunch thing is non-negotiable. I have seen people fail this test.',
    'Curious and kind. Simple bar. Somehow rare.',
  ],
  'Unpopular opinion I hold…': [
    'I have seen them eat cold pizza for breakfast with zero shame. Committed.',
    'They sent me a voice note about this at 11pm. It was persuasive.',
    'Wrong about the 6 train, right about everything else.',
  ],
  'My go-to karaoke song…': [
    'I have witnessed this. It is a full performance. Respect.',
    'They know every word. Every. Single. Word. Do not underestimate.',
    'Nobody in the room is ready when this song comes on.',
  ],
};

// Fallback responses if the question isn't in our map
const FALLBACK_RESPONSES: [string, string, string] = [
  'I can personally vouch for this. No notes.',
  "This is the most accurate thing they've ever written about themselves.",
  'Knew them for years and this tracks completely.',
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Seeding winger prompt responses for dev user…\n');

  // 1. Get the dev user's ID
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listError) throw listError;

  const devUser = listData.users.find((u) => u.email === 'dev@local.test');
  if (!devUser) throw new Error('dev@local.test not found — run npm run db:fixtures first');
  console.log(`Dev user: ${devUser.id}`);

  // 2. Get the dev user's dating profile + prompts (with template questions)
  const { data: dp, error: dpError } = await supabase
    .from('dating_profiles')
    .select(`id, prompts:profile_prompts(id, template:prompt_templates(question))`)
    .eq('user_id', devUser.id)
    .single();
  if (dpError) throw dpError;
  if (!dp.prompts || dp.prompts.length === 0) {
    console.log('Dev user has no prompts. Run npm run db:fixtures first.');
    return;
  }
  console.log(`Found ${dp.prompts.length} prompts\n`);

  // 3. Get the winger user IDs (Alex Chen, Jordan Kim, Sam Rivera)
  const WINGER_EMAILS = [
    'winger.alex.chen@seed.orbit.test',
    'winger.jordan.kim@seed.orbit.test',
    'winger.sam.rivera@seed.orbit.test',
  ];
  const wingerIds = WINGER_EMAILS.map((email) => {
    const u = listData.users.find((u) => u.email === email);
    if (!u) throw new Error(`Winger not found: ${email} — run npm run db:fixtures first`);
    return u.id;
  });
  console.log(`Wingers: ${wingerIds.length} found`);

  // 4. Insert one response per winger per prompt (skip if already exists)
  let inserted = 0;
  let skipped = 0;

  for (const prompt of dp.prompts) {
    const question = (prompt.template as any)?.question ?? '';
    const responses = RESPONSES_BY_QUESTION[question] ?? FALLBACK_RESPONSES;

    console.log(`\nPrompt: "${question}"`);

    for (let i = 0; i < wingerIds.length; i++) {
      const wingerId = wingerIds[i];
      const message = responses[i];

      // Check if a response already exists from this winger on this prompt
      const { data: existing } = await supabase
        .from('prompt_responses')
        .select('id')
        .eq('user_id', wingerId)
        .eq('profile_prompt_id', prompt.id)
        .maybeSingle();

      if (existing) {
        console.log(`  winger ${i + 1} — already exists, skipping`);
        skipped++;
        continue;
      }

      const { error } = await supabase.from('prompt_responses').insert({
        user_id: wingerId,
        profile_prompt_id: prompt.id,
        message,
        is_approved: false,
      });
      if (error) throw new Error(`Response insert error: ${error.message}`);
      console.log(`  winger ${i + 1} — "${message.slice(0, 60)}…"`);
      inserted++;
    }
  }

  console.log(`\nDone. ${inserted} responses inserted, ${skipped} skipped.`);
  console.log('Open Profile → Prompts tab to see the pending wingperson comments.');
}

main().catch((err) => {
  console.error('\nFailed:', err);
  process.exit(1);
});
