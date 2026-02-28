import { useCallback, useEffect, useState } from 'react';
import { getMatches, type MatchRow } from '@/queries/matches';
import { useAuth } from '@/context/auth';

export function useMatches() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getMatches(userId);
      if (err) throw err;
      setMatches(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { matches, loading, error, refresh: load };
}
