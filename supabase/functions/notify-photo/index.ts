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
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body }),
  });
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

  // WHEN clause on trigger guarantees suggester_id is non-null
  const { record } = payload;
  const dating_profile_id = record.dating_profile_id as string;
  const suggester_id = record.suggester_id as string;

  if (!dating_profile_id || !suggester_id) {
    return json({ error: 'dating_profile_id and suggester_id required' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve dating_profile → user_id
  const { data: datingProfile } = await admin
    .from('dating_profiles')
    .select('user_id')
    .eq('id', dating_profile_id)
    .single();

  if (!datingProfile?.user_id) return json({ ok: true }, 200);

  const { data: profile } = await admin
    .from('profiles')
    .select('push_token')
    .eq('id', datingProfile.user_id)
    .single();

  if (!profile?.push_token) return json({ ok: true }, 200);

  await sendPush(
    profile.push_token,
    'New photo suggestion 📸',
    'Your wingperson suggested a photo for your profile.',
  );

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
