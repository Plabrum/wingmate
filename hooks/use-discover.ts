import { useEffect, useRef, useState } from 'react';
import { getDiscoverPool, type DiscoverCard } from '@/queries/discover';
import {
  recordDecision,
  actOnSuggestion as actOnSuggestionQuery,
  checkMutualMatch,
} from '@/queries/decisions';
import { useAuth } from '@/context/auth';

const PAGE_SIZE = 20;

export function useDiscover(filterWingerId: string | null) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [pool, setPool] = useState<DiscoverCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Reset and fetch initial pool whenever filterWingerId (or user) changes
  useEffect(() => {
    if (!userId) return;

    setPool([]);
    setIndex(0);
    offsetRef.current = 0;
    setLoading(true);

    getDiscoverPool(userId, filterWingerId, PAGE_SIZE, 0).then(({ data }) => {
      const cards = data ?? [];
      setPool(cards);
      offsetRef.current = cards.length;
      setLoading(false);
    });
  }, [userId, filterWingerId]);

  // Prefetch next page when approaching the end of the pool
  useEffect(() => {
    if (pool.length === 0) return;
    if (index >= pool.length - 3) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pool.length]);

  async function loadMore() {
    if (!userId || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const { data } = await getDiscoverPool(userId, filterWingerId, PAGE_SIZE, offsetRef.current);
    if (data && data.length > 0) {
      setPool((prev) => [...prev, ...data]);
      offsetRef.current += data.length;
    }
    loadingMoreRef.current = false;
  }

  async function like(): Promise<'match' | 'liked' | 'error'> {
    if (!userId) return 'error';
    const card = pool[index];
    if (!card) return 'error';

    // Optimistic advance
    setIndex((prev) => prev + 1);

    let error: unknown;
    if (card.suggested_by) {
      const result = await actOnSuggestionQuery(userId, card.profile_id, 'approved');
      error = result.error;
    } else {
      const result = await recordDecision(userId, card.profile_id, 'approved');
      error = result.error;
    }

    if (error) {
      // Roll back on failure
      setIndex((prev) => prev - 1);
      return 'error';
    }

    const { data: matchData } = await checkMutualMatch(userId, card.user_id);
    return matchData ? 'match' : 'liked';
  }

  async function pass(): Promise<void> {
    if (!userId) return;
    const card = pool[index];
    if (!card) return;

    // Optimistic advance
    setIndex((prev) => prev + 1);

    if (card.suggested_by) {
      await actOnSuggestionQuery(userId, card.profile_id, 'declined');
    } else {
      await recordDecision(userId, card.profile_id, 'declined');
    }
  }

  async function actOnSuggestion(decision: 'approved' | 'declined') {
    if (decision === 'approved') return like();
    return pass();
  }

  return { pool, index, loading, like, pass, actOnSuggestion };
}
