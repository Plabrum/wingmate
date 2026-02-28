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

  let payload: { user_a_id?: unknown; user_b_id?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { user_a_id, user_b_id } = payload;
  if (typeof user_a_id !== 'string' || typeof user_b_id !== 'string') {
    return json({ error: 'user_a_id and user_b_id required' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, push_token, chosen_name')
    .in('id', [user_a_id, user_b_id]);

  if (!profiles) return json({ ok: true }, 200);

  await Promise.all(
    profiles.map((p) => {
      if (!p.push_token) return Promise.resolve();
      return sendPush(p.push_token, "It's a Match! 🎉", "You have a new match. Say hello!");
    }),
  );

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
