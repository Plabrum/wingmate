import { useRef, useState } from 'react';
import { type DiscoverCard } from '@/queries/discover';
import {
  recordDecision,
  actOnSuggestion as actOnSuggestionQuery,
  checkMutualMatch,
} from '@/queries/decisions';

const PAGE_SIZE = 20;

export type PoolFetcher = (
  userId: string,
  pageSize: number,
  offset: number
) => Promise<{ data: DiscoverCard[] | null; error: Error | null }>;

export function useDiscover(
  fetchPool: PoolFetcher,
  userId: string | null,
  initialPool: DiscoverCard[]
) {
  const [pool, setPool] = useState(initialPool);
  const [index, setIndex] = useState(0);

  const offsetRef = useRef(initialPool.length);
  const loadingMoreRef = useRef(false);

  async function loadMore() {
    if (!userId || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const { data } = await fetchPool(userId, PAGE_SIZE, offsetRef.current);
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

    // Optimistic advance; trigger prefetch when nearing the end
    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= pool.length - 3) loadMore();

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

    // Optimistic advance; trigger prefetch when nearing the end
    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= pool.length - 3) loadMore();

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

  return { pool, index, like, pass, actOnSuggestion };
}
