import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

let _admin: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (_admin) return _admin;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  _admin = createClient(url, key);
  return _admin;
}

// Removes an object from the profile-photos bucket. Logs and swallows errors —
// the caller has already deleted the DB row, and an orphaned file is harmless
// (no broken reference). Never throws.
export async function removeProfilePhoto(storageUrl: string): Promise<void> {
  try {
    const { error } = await admin().storage.from('profile-photos').remove([storageUrl]);
    if (error) console.error('[storage] remove failed:', storageUrl, error);
  } catch (err) {
    console.error('[storage] remove threw:', storageUrl, err);
  }
}
