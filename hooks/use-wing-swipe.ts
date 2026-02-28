import { useEffect, useRef, useState } from 'react';
import { getWingPool, type WingCard } from '@/queries/discover';
import { wingSuggestApprove, wingSuggestDecline } from '@/queries/decisions';

const PAGE_SIZE = 20;

export function useWingSwipe(wingerId: string, daterId: string) {
  const [pool, setPool] = useState<WingCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Reset and fetch initial pool whenever wingerId or daterId changes
  useEffect(() => {
    setPool([]);
    setIndex(0);
    offsetRef.current = 0;
    setLoading(true);

    getWingPool(wingerId, daterId, PAGE_SIZE, 0).then(({ data }) => {
      const cards = data ?? [];
      setPool(cards);
      offsetRef.current = cards.length;
      setLoading(false);
    });
  }, [wingerId, daterId]);

  // Prefetch next page when approaching the end of the pool
  useEffect(() => {
    if (pool.length === 0) return;
    if (index >= pool.length - 3) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pool.length]);

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

    // Optimistic advance
    setIndex((prev) => prev + 1);

    const { error } = await wingSuggestApprove(daterId, card.profile_id, wingerId, note);
    if (error) {
      // Roll back on failure
      setIndex((prev) => prev - 1);
    }
  }

  async function decline(): Promise<void> {
    const card = pool[index];
    if (!card) return;

    // Optimistic advance (fire-and-forget — no rollback needed)
    setIndex((prev) => prev + 1);
    await wingSuggestDecline(daterId, card.profile_id, wingerId);
  }

  return { pool, index, loading, suggest, decline };
}
