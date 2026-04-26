import { createClient } from 'jsr:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: 'public';
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendPush(token: string, title: string, body: string) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body }),
  });
  if (!res.ok) {
    console.error('Expo push failed:', await res.text());
  }
}

function pushEnabled(): boolean {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!pushEnabled()) {
    console.log('[notify-invite] push disabled in this environment, skipping');
    return json({ ok: true, skipped: 'push-disabled' }, 200);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const winger_id = payload.record.winger_id;

  // If winger_id is null the invitee hasn't signed up yet — SMS handled elsewhere
  if (!winger_id || typeof winger_id !== 'string') {
    return json({ ok: true }, 200);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: profile } = await admin
    .from('profiles')
    .select('push_token')
    .eq('id', winger_id)
    .single();

  if (!profile?.push_token) return json({ ok: true }, 200);

  await sendPush(
    profile.push_token,
    "You've been invited! 🤝",
    'Someone wants you to be their wingperson on Pear.',
  );

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
