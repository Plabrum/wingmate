import { supabase } from '@/lib/supabase';

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a photo file to the profile-photos bucket.
 * Files are stored at {userId}/{filename} so the storage RLS policy allows it.
 *
 * @param userId  The uploading user's ID (used for the folder prefix).
 * @param file    The file to upload (Blob or ArrayBuffer from expo-image-picker).
 * @param filename A unique filename, e.g. `${Date.now()}.jpg`.
 * @returns       The bucket-relative path to store in profile_photos.storage_url.
 */
export async function uploadPhoto(userId: string, file: Blob, filename: string) {
  const path = `${userId}/${filename}`;
  const { error } = await supabase.storage.from('profile-photos').upload(path, file, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  return { path, error };
}

/**
 * Get a public URL for a photo. Used to display photos in the UI.
 * The bucket is public so no signed URL is needed.
 */
export function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── DB row operations ─────────────────────────────────────────────────────────

/**
 * Insert a profile_photos row after a successful upload.
 *
 * @param datingProfileId  The dating_profiles.id this photo belongs to.
 * @param storagePath      The bucket-relative path returned by uploadPhoto.
 * @param displayOrder     0-indexed position in the photo grid.
 * @param suggesterId      null = self-uploaded; set = wingperson suggestion (pending approval).
 */
export function insertPhoto(
  datingProfileId: string,
  storagePath: string,
  displayOrder: number,
  suggesterId: string | null = null
) {
  return supabase.from('profile_photos').insert({
    dating_profile_id: datingProfileId,
    storage_url: storagePath,
    display_order: displayOrder,
    suggester_id: suggesterId,
    // Self-uploads are immediately approved; wingperson suggestions start null.
    approved_at: suggesterId === null ? new Date().toISOString() : null,
  });
}

/** Approve a wingperson-suggested photo. */
export function approvePhoto(photoId: string) {
  return supabase
    .from('profile_photos')
    .update({ approved_at: new Date().toISOString() })
    .eq('id', photoId);
}

/** Reject (delete) a suggested photo. Also delete from storage. */
export async function rejectPhoto(photoId: string, storagePath: string) {
  const [dbResult, storageResult] = await Promise.all([
    supabase.from('profile_photos').delete().eq('id', photoId),
    supabase.storage.from('profile-photos').remove([storagePath]),
  ]);
  return { dbResult, storageResult };
}

/** Delete one of the user's own photos (from both DB and storage). */
export async function deleteOwnPhoto(photoId: string, storagePath: string) {
  const [dbResult, storageResult] = await Promise.all([
    supabase.from('profile_photos').delete().eq('id', photoId),
    supabase.storage.from('profile-photos').remove([storagePath]),
  ]);
  return { dbResult, storageResult };
}

/** Update display_order for a batch of photos (drag-to-reorder). */
export async function reorderPhotos(updates: Array<{ id: string; display_order: number }>) {
  // Supabase JS v2 doesn't support batch updates natively; fire in parallel.
  return Promise.all(
    updates.map(({ id, display_order }) =>
      supabase.from('profile_photos').update({ display_order }).eq('id', id)
    )
  );
}
