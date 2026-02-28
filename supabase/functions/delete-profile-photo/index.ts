import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  // Verify the caller's JWT and resolve their user id
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Input ───────────────────────────────────────────────────────────────────
  const photoId = new URL(req.url).searchParams.get('photo_id');
  if (!photoId) return json({ error: 'Missing photo_id query param' }, 400);

  // ── Privileged client (service role) ───────────────────────────────────────
  // Used for all mutations after we have verified ownership in app logic.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Ownership check ─────────────────────────────────────────────────────────
  // Fetch the photo and the dating_profile it belongs to in one query.
  const { data: photo, error: fetchError } = await admin
    .from('profile_photos')
    .select('id, storage_url, dating_profiles!inner(user_id)')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) return json({ error: 'Photo not found' }, 404);

  // Only the dating profile owner may delete a photo.
  // Suggesters can view but not delete — the profile owner decides.
  const profileOwnerId = (photo.dating_profiles as { user_id: string }).user_id;
  if (profileOwnerId !== user.id) return json({ error: 'Forbidden' }, 403);

  // ── Delete DB row first ─────────────────────────────────────────────────────
  // If the storage delete later fails, the file will be orphaned (harmless —
  // no broken references). Reversing the order risks a DB row pointing at a
  // deleted file, which is worse.
  const { error: dbError } = await admin
    .from('profile_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) {
    console.error('DB delete failed:', dbError);
    return json({ error: 'Failed to delete photo record' }, 500);
  }

  // ── Delete from storage ─────────────────────────────────────────────────────
  const { error: storageError } = await admin.storage
    .from('profile-photos')
    .remove([photo.storage_url]);

  if (storageError) {
    // DB row is already gone so there is no broken reference, but the file is
    // now orphaned. Log it so it can be cleaned up if needed.
    console.error(`Orphaned storage file (DB row deleted): ${photo.storage_url}`, storageError);
    // Still return success to the client — from their perspective the photo
    // is gone and the UX should not be blocked by a background storage error.
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
