import { useRef, useState } from 'react';
import { wingProfileToCard, type WingCard } from '@/queries/discover';
import { getApiWingPool } from '@/lib/api/generated/wing-pool/wing-pool';
import { postApiDecisionsSuggestions } from '@/lib/api/generated/decisions/decisions';

const PAGE_SIZE = 20;

export function useWingSwipe(daterId: string, initialPool: WingCard[]) {
  const [pool, setPool] = useState(initialPool);
  const [index, setIndex] = useState(0);

  const offsetRef = useRef(initialPool.length);
  const loadingMoreRef = useRef(false);

  async function loadMore() {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const res = await getApiWingPool({
      daterId,
      pageSize: PAGE_SIZE,
      pageOffset: offsetRef.current,
    });
    if (res.status === 200 && res.data.length > 0) {
      const cards = res.data.map(wingProfileToCard);
      setPool((prev) => [...prev, ...cards]);
      offsetRef.current += cards.length;
    }
    loadingMoreRef.current = false;
  }

  async function suggest(note: string | null): Promise<void> {
    const card = pool[index];
    if (!card) return;

    // Optimistic advance; trigger prefetch when nearing the end
    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= pool.length - 3) loadMore();

    try {
      await postApiDecisionsSuggestions({
        daterId,
        recipientId: card.user_id,
        note,
        decision: null,
      });
    } catch {
      // Roll back on failure
      setIndex((prev) => prev - 1);
    }
  }

  async function decline(): Promise<void> {
    const card = pool[index];
    if (!card) return;

    // Optimistic advance (fire-and-forget — no rollback needed); trigger prefetch when nearing end
    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= pool.length - 3) loadMore();

    try {
      await postApiDecisionsSuggestions({
        daterId,
        recipientId: card.user_id,
        decision: 'declined',
      });
    } catch {
      // Match legacy behavior: declines are fire-and-forget, no rollback.
    }
  }

  return { pool, index, suggest, decline };
}
