import { use, useState, useCallback, useTransition } from 'react';

const cache = new Map<unknown, Promise<unknown>>();

function normalizeKey(key: unknown): unknown {
  return Array.isArray(key) ? JSON.stringify(key) : key;
}

/**
 * Suspense-compatible data fetching hook.
 *
 * - Function reference is the cache key by default — no string key needed
 * - Pass an explicit `key` when the executed fn differs from the cache key (e.g. wrappers)
 * - Pass a tuple `key` for parameterised queries: `['matches', userId]`
 * - Errors thrown by queryFn propagate to the nearest error boundary
 * - Must be rendered inside a <Suspense> boundary
 */
export function useSuspenseQuery<T>(queryFn: () => Promise<T>, key: unknown = queryFn): T {
  const k = normalizeKey(key);
  if (!cache.has(k)) {
    cache.set(k, queryFn());
  }
  return use(cache.get(k) as Promise<T>);
}

export function invalidateQuery(...keys: unknown[]) {
  for (const key of keys) cache.delete(normalizeKey(key));
}

/**
 * Co-locate a pull-to-refresh trigger with a useSuspenseQuery data consumer.
 *
 * Usage:
 *   const KEY = ['matches', userId] as const
 *   const matches = useSuspenseQuery(() => getMatches(userId), KEY)
 *   const [refresh, isRefreshing] = useQueryRefresh(KEY)
 *   <FlatList onRefresh={refresh} refreshing={isRefreshing} />
 *
 * Wrapped in startTransition so React keeps the current UI visible while the
 * new promise resolves — no full-screen flash.
 */
export function useQueryRefresh(key: unknown) {
  const [, setVersion] = useState(0);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      invalidateQuery(key);
      setVersion((v) => v + 1);
    });
  }, [key]);

  return [refresh, isPending] as const;
}

type SupabaseResult<T> = { data: T | null; error: { message: string } | null };

/**
 * Like useSuspenseQuery but unwraps a Supabase { data, error } result,
 * throwing on error so it propagates to the nearest error boundary.
 */
export function useSupabaseSuspenseQuery<T, R = T>(
  queryFn: () => Promise<SupabaseResult<T>>,
  select?: (data: T) => R
): R {
  return useSuspenseQuery(async () => {
    const { data, error } = await queryFn();
    if (error) throw new Error(error.message);
    return select ? select(data!) : (data as unknown as R);
  }, queryFn); // use the original fn as the key, not the wrapper
}
