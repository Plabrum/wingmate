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

  let payload: { actor_id?: unknown; suggested_by?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { actor_id, suggested_by } = payload;
  if (typeof actor_id !== 'string' || typeof suggested_by !== 'string') {
    return json({ error: 'actor_id and suggested_by required' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch dater push_token and suggester name together
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, push_token, chosen_name')
    .in('id', [actor_id, suggested_by]);

  if (!profiles) return json({ ok: true }, 200);

  const dater = profiles.find((p) => p.id === actor_id);
  const suggester = profiles.find((p) => p.id === suggested_by);

  if (!dater?.push_token) return json({ ok: true }, 200);

  const suggesterName = suggester?.chosen_name ?? 'Your wingperson';

  await sendPush(
    dater.push_token,
    'New profile suggestion 👀',
    `${suggesterName} suggested a profile for you to check out.`,
  );

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
