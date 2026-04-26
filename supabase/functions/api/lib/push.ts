import { eq } from 'drizzle-orm';
import type { DBOrTx } from '../db/client.ts';
import { profiles } from '../db/schema.ts';
import { config } from './config.ts';

// Sends an Expo push. No-ops on null token; logs locally instead of delivering
// when not running on hosted Supabase. Logs and swallows errors — push failure
// must never roll back the user-facing transaction.
export async function sendPush(
  token: string | null,
  title: string,
  body: string,
): Promise<void> {
  if (!token) return;
  if (!config.isProd) {
    console.log('[push:local]', { title, body });
    return;
  }

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body }),
    });
    if (!res.ok) {
      console.error('[push] expo push failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[push] expo push threw:', err);
  }
}

export async function getPushToken(db: DBOrTx, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ push_token: profiles.pushToken })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.push_token ?? null;
}
