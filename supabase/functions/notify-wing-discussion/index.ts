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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { record } = payload;
  const discussion_id = record.discussion_id as string;
  const sender_id = record.sender_id as string;
  const msgBody = record.body as string;

  if (!discussion_id || !sender_id || !msgBody) {
    return json({ error: 'discussion_id, sender_id, and body required' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: discussion } = await admin
    .from('wing_discussions')
    .select('dater_id, winger_id')
    .eq('id', discussion_id)
    .single();

  if (!discussion) return json({ ok: true }, 200);

  const recipient_id =
    discussion.dater_id === sender_id ? discussion.winger_id : discussion.dater_id;

  if (recipient_id === sender_id) return json({ ok: true }, 200);

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, push_token, chosen_name')
    .in('id', [sender_id, recipient_id]);

  if (!profiles) return json({ ok: true }, 200);

  const sender = profiles.find((p) => p.id === sender_id);
  const recipient = profiles.find((p) => p.id === recipient_id);

  if (!recipient?.push_token) return json({ ok: true }, 200);

  const senderName = sender?.chosen_name ?? 'Someone';
  const preview = msgBody.length > 80 ? msgBody.slice(0, 77) + '…' : msgBody;

  await sendPush(recipient.push_token, `${senderName} about a profile`, preview);

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
