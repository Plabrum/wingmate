import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS is not enforced by React Native — these headers only matter if this
// function is ever called from a browser (e.g. Supabase dashboard, web client).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Input ─────────────────────────────────────────────────────────────────────
  let body: { phone?: unknown; daterName?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { phone, daterName } = body;
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return json({ error: 'phone is required' }, 400);
  }
  if (!daterName || typeof daterName !== 'string' || daterName.trim() === '') {
    return json({ error: 'daterName is required' }, 400);
  }

  // ── Twilio ────────────────────────────────────────────────────────────────────
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioNumber = Deno.env.get('TWILIO_NUMBER');
  const appUrl = Deno.env.get('APP_DOWNLOAD_URL') ?? 'https://wingmate.app';

  if (!accountSid || !authToken || !twilioNumber) {
    console.error('Missing Twilio credentials');
    return json({ error: 'SMS service not configured' }, 500);
  }

  const message =
    `${daterName} invited you to be their wingperson on Wingmate. Download: ${appUrl}`;

  const twilioBody = new URLSearchParams({
    To: phone,
    From: twilioNumber,
    Body: message,
  });

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioBody.toString(),
    },
  );

  if (!twilioRes.ok) {
    const errorText = await twilioRes.text();
    console.error('Twilio error:', errorText);
    return json({ error: 'Failed to send SMS' }, 500);
  }

  return json({ success: true }, 200);
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
