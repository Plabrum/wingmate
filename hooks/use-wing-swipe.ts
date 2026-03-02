import { useRef, useState } from 'react';
import { getWingPool, type WingCard } from '@/queries/discover';
import { wingSuggestApprove, wingSuggestDecline } from '@/queries/decisions';

const PAGE_SIZE = 20;

export function useWingSwipe(wingerId: string, daterId: string, initialPool: WingCard[]) {
  const [pool, setPool] = useState(initialPool);
  const [index, setIndex] = useState(0);

  const offsetRef = useRef(initialPool.length);
  const loadingMoreRef = useRef(false);

  async function loadMore() {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const { data } = await getWingPool(wingerId, daterId, PAGE_SIZE, offsetRef.current);
    if (data && data.length > 0) {
      setPool((prev) => [...prev, ...data]);
      offsetRef.current += data.length;
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

    const { error } = await wingSuggestApprove(daterId, card.profile_id, wingerId, note);
    if (error) {
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

    await wingSuggestDecline(daterId, card.profile_id, wingerId);
  }

  return { pool, index, suggest, decline };
}
