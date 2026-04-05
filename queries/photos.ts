import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { toast } from 'sonner-native';

import { supabase } from '@/lib/supabase';

// ── Photo picker ──────────────────────────────────────────────────────────────

/**
 * Prompts for media library permission, opens the image picker, and resizes
 * the selected image to a max width of 1200px at 0.8 JPEG quality.
 * Returns the local URI of the processed image, or null if cancelled/denied.
 */
export async function pickAndResizePhoto(): Promise<string | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    toast.error('Allow photo access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const ctx = ImageManipulator.manipulate(result.assets[0].uri);
  ctx.resize({ width: 1200 });
  const imageRef = await ctx.renderAsync();
  const saved = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a local image URI to the profile-photos bucket.
 * Uses fetch() → arrayBuffer() per the official Supabase Expo docs.
 * Note: fetch().blob() is broken on iOS new architecture; arrayBuffer() works.
 */
export async function uploadPhoto(userId: string, uri: string, filename: string) {
  const path = `${userId}/${filename}`;

  const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());

  const { error } = await supabase.storage.from('profile-photos').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  return { path, error };
}

/**
 * Get a public URL for a photo. Used to display photos in the UI.
 * The bucket is public so no signed URL is needed.
 */
export function getPhotoUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('http')) return storagePath;
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
export async function reorderPhotos(updates: { id: string; display_order: number }[]) {
  // Supabase JS v2 doesn't support batch updates natively; fire in parallel.
  return Promise.all(
    updates.map(({ id, display_order }) =>
      supabase.from('profile_photos').update({ display_order }).eq('id', id)
    )
  );
}
