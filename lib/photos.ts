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
export async function pickAndResizePhoto(opts?: {
  width?: number;
  aspect?: [number, number];
}): Promise<string | null> {
  const { width = 1200, aspect } = opts ?? {};

  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    toast.error('Allow photo access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const ctx = ImageManipulator.manipulate(result.assets[0].uri);
  ctx.resize({ width });
  const imageRef = await ctx.renderAsync();
  const saved = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

/**
 * Upload a JPEG to the avatars bucket as <userId>.jpg (upsert), then persist
 * the resulting public URL to profiles.avatar_url.
 */
export async function uploadAvatar(
  userId: string,
  uri: string
): Promise<{ url: string | null; error: Error | null }> {
  const path = `${userId}.jpg`;
  const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);

  return { url, error: profileError ?? null };
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

/**
 * Remove a photo file from the profile-photos bucket. Used after the API
 * deletes the metadata row to keep storage in sync.
 */
export async function removePhotoStorage(storagePath: string) {
  return supabase.storage.from('profile-photos').remove([storagePath]);
}
