import { useState } from 'react';
import { toast } from 'sonner-native';

import { postApiPhotos, postApiPhotosUploadUrl } from '@/lib/api/generated/photos/photos';
import { supabase } from '@/lib/supabase';

// Winger-suggests-a-photo flow. Asks the API for a signed upload token into
// the dater's storage folder, uploads the file body, then writes the
// profile_photos metadata row. Owns its own pending state and error toast —
// callsites await `suggest(...)` and branch on the boolean.
export function useSuggestPhoto() {
  const [isPending, setIsPending] = useState(false);

  const suggest = async (
    datingProfileId: string,
    uri: string,
    filename: string,
    displayOrder: number
  ): Promise<boolean> => {
    setIsPending(true);
    try {
      const { path, uploadToken } = await postApiPhotosUploadUrl({
        datingProfileId,
        filename,
      });
      const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .uploadToSignedUrl(path, uploadToken, arrayBuffer, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      await postApiPhotos({ datingProfileId, storageUrl: path, displayOrder });
      return true;
    } catch {
      toast.error('Failed to suggest photo. Please try again.');
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { suggest, isPending };
}
