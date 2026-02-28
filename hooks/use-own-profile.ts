import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth';
import { getOwnDatingProfile, type OwnDatingProfile } from '@/queries/profiles';

export function useOwnProfile() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [data, setData] = useState<OwnDatingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: result } = await getOwnDatingProfile(userId);
    setData(result ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
