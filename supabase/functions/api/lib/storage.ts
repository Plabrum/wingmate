import { createClient } from 'jsr:@supabase/supabase-js@2';
import { config } from './config.ts';

// Removes an object from the profile-photos bucket using the caller's JWT.
// Storage RLS scopes deletes to the file's owning folder
// (`auth.uid()::text = (storage.foldername(name))[1]`) — so this only succeeds
// for files the caller uploaded. A wingperson-suggested photo lives in the
// suggester's folder; if the dater rejects it, the storage delete fails and
// the file is orphaned. That's acceptable: logs-and-swallows, no broken
// reference once the DB row is gone.
export async function removeProfilePhoto(token: string, storageUrl: string): Promise<void> {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  try {
    const { error } = await client.storage.from('profile-photos').remove([storageUrl]);
    if (error) console.error('[storage] remove failed:', storageUrl, error);
  } catch (err) {
    console.error('[storage] remove threw:', storageUrl, err);
  }
}
