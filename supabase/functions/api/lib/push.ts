import { eq } from 'drizzle-orm';
import type { DBOrTx } from '../db/client.ts';
import { profiles } from '../db/schema.ts';

// Whether the api function is allowed to deliver push notifications.
//
// Gated by PUSH_FROM_API to avoid double-delivery during the trigger overlap
// window. Until PR 2 drops the `pg_net` triggers in prod, this defaults off
// and the legacy notify-* path remains the sole sender. Locally, set
// PUSH_FROM_API=true (and PUSH_ENABLED=true to bypass the host check) to
// exercise the new path against a real device token.
export function pushEnabled(): boolean {
  if (Deno.env.get('PUSH_FROM_API') !== 'true') return false;

  const override = Deno.env.get('PUSH_ENABLED');
  if (override === 'true') return true;
  if (override === 'false') return false;

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  try {
    return /\.supabase\.(co|in)$/i.test(new URL(url).host);
  } catch {
    return false;
  }
}

// Sends an Expo push. No-ops on null token or when push is disabled in this
// environment. Logs and swallows errors — push failure must never roll back
// the user-facing transaction.
export async function sendPush(
  token: string | null,
  title: string,
  body: string,
): Promise<void> {
  if (!token) return;
  if (!pushEnabled()) return;

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
