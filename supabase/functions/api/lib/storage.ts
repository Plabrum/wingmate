import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { config } from './config.ts';

let _admin: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(config.supabaseUrl, config.serviceRoleKey);
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
