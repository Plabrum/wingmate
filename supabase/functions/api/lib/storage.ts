import { HTTPException } from 'hono/http-exception';
import { config } from './config.ts';

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

// Mints a one-shot signed upload token into profile-photos for the caller.
// The Storage RLS check on `storage.objects` INSERT runs as the caller, so
// this only succeeds when the caller can already write to {path}'s folder
// (own folder, or active wingperson uploading into the dater's folder).
// The returned token feeds supabase-js `uploadToSignedUrl(path, token, body)`.
export async function createSignedUploadToken(
  token: string,
  path: string,
): Promise<{ uploadToken: string }> {
  const url = `${config.supabaseUrl}/storage/v1/object/upload/sign/profile-photos/${encodePath(path)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[storage] sign failed:', path, res.status, body);
    throw new HTTPException(500, { message: 'Could not create upload URL' });
  }
  const json = (await res.json()) as { url: string; token: string };
  return { uploadToken: json.token };
}

// Removes an object from the profile-photos bucket via the Storage REST API,
// authenticated with the caller's JWT so RLS sees `auth.uid()`. Log-and-swallow:
// a failed delete just leaks one CDN object, never a broken DB reference.
export async function removeProfilePhoto(token: string, storageUrl: string): Promise<void> {
  const url = `${config.supabaseUrl}/storage/v1/object/profile-photos/${encodePath(storageUrl)}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error('[storage] remove failed:', storageUrl, res.status, await res.text());
    }
  } catch (err) {
    console.error('[storage] remove threw:', storageUrl, err);
  }
}
