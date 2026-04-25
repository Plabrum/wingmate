// TRANSITIONAL: uses legacy `DiscoverCard` (snake_case) and `PoolFetcher`'s
// `{ data, error }` shape to stay compatible with the pre-migration screens. When the
// discover + likes-you endpoints are fully ported and `DiscoverCard` is replaced by the
// Orval-generated `DiscoverProfile` (camelCase), flip `PoolFetcher` to return
// `DiscoverProfile[]` and throw on error — the callsite try/catch in discover.tsx goes
// away and this hook becomes a thin swipe-state machine around the generated hook.

import { useRef, useState } from 'react';
import { type DiscoverCard } from '@/queries/discover';
import type { DirectDecisionRequestDecision } from '@/lib/api/generated/model';
import {
  postApiDecisions,
  postApiDecisionsSuggestionsAct,
} from '@/lib/api/generated/decisions/decisions';

const PAGE_SIZE = 20;

export type LikeResult = 'match' | 'liked' | 'error';

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
  const swipingRef = useRef(false);

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

  async function decide(
    card: DiscoverCard,
    decision: DirectDecisionRequestDecision
  ): Promise<{ matched: boolean } | { error: true }> {
    try {
      if (card.suggested_by) {
        const res = await postApiDecisionsSuggestionsAct({
          recipientId: card.user_id,
          decision,
        });
        if (res.status !== 200) return { error: true };
        return { matched: res.data.match != null };
      }
      const res = await postApiDecisions({ recipientId: card.user_id, decision });
      if (res.status !== 200) return { error: true };
      return { matched: res.data.match != null };
    } catch {
      return { error: true };
    }
  }

  async function like(): Promise<LikeResult> {
    if (!userId || swipingRef.current) return 'error';
    const card = pool[index];
    if (!card) return 'error';
    swipingRef.current = true;

    // Optimistic advance; trigger prefetch when nearing the end
    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= pool.length - 3) loadMore();

    const result = await decide(card, 'approved');
    swipingRef.current = false;

    if ('error' in result) {
      // Roll back on failure
      setIndex((prev) => prev - 1);
      return 'error';
    }
    return result.matched ? 'match' : 'liked';
  }

  async function pass(): Promise<void> {
    if (!userId || swipingRef.current) return;
    const card = pool[index];
    if (!card) return;
    swipingRef.current = true;

    // Optimistic advance; trigger prefetch when nearing the end
    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= pool.length - 3) loadMore();

    await decide(card, 'declined');
    swipingRef.current = false;
  }

  async function actOnSuggestion(decision: DirectDecisionRequestDecision) {
    if (decision === 'approved') return like();
    return pass();
  }

  return { pool, index, like, pass, actOnSuggestion };
}
