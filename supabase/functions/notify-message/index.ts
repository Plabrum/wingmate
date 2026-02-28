import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendPush(token: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { match_id?: unknown; sender_id?: unknown; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { match_id, sender_id, body: msgBody } = payload;
  if (
    typeof match_id !== 'string' ||
    typeof sender_id !== 'string' ||
    typeof msgBody !== 'string'
  ) {
    return json({ error: 'match_id, sender_id, and body required' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Get the match to find the recipient
  const { data: match } = await admin
    .from('matches')
    .select('user_a_id, user_b_id')
    .eq('id', match_id)
    .single();

  if (!match) return json({ ok: true }, 200);

  const recipient_id =
    match.user_a_id === sender_id ? match.user_b_id : match.user_a_id;

  // Guard: don't notify if sender == recipient (shouldn't happen, but be safe)
  if (recipient_id === sender_id) return json({ ok: true }, 200);

  // Fetch sender name + recipient push_token together
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

  await sendPush(recipient.push_token, `New message from ${senderName}`, preview);

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
