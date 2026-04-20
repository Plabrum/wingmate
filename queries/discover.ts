// TRANSITIONAL: this file is being drained. The long-term end state is zero wrapper
// functions here — screens import generated hooks from `@/lib/api/generated/` directly.
// What remains below is the pre-migration surface:
//   • Discover pool: PORTED — `getApiDiscover` is called at the callsite; only the
//     `discoverProfileToCard` shape-bridge and `useInitialPool` wrapper for the likes-you
//     branch still live here. Both die when `DiscoverCard` is replaced by `DiscoverProfile`
//     (camelCase) and when likes-you is ported.
//   • Wing pool, likes-you pool, winger tabs: NOT YET PORTED — still on `supabase.rpc`.
//     Port each to `supabase/functions/api/domains/<name>/` and delete the corresponding
//     wrappers + hooks from this file as they move.
// Do not add new helpers here. New endpoints go on the `api` function.

import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';
import { getApiDiscover } from '@/lib/api/generated/discover/discover';
import type { DiscoverProfile } from '@/lib/api/generated/model';

// Shape returned by the get_discover_pool and get_wing_pool RPCs.
// Keep in sync with the function return types in the migration.
export type DiscoverCard = {
  profile_id: string;
  user_id: string;
  chosen_name: string;
  gender: Enums<'gender'> | null;
  age: number;
  city: string;
  bio: string | null;
  dating_status: Enums<'dating_status'>;
  interests: string[];
  first_photo: string | null;
  // Present when the card comes from a wingperson suggestion:
  wing_note: string | null;
  suggested_by: string | null;
  suggester_name: string | null;
};

export type WingCard = Omit<DiscoverCard, 'wing_note' | 'suggested_by' | 'suggester_name'>;

// ── Discover pool (dater's Discover screen) ───────────────────────────────────
// Backed by the `api` edge function (see supabase/functions/api/routes/discover/).
// Call `getApiDiscover` from `@/lib/api/generated/discover/discover` directly at the
// callsite; `discoverProfileToCard` maps the camelCase response to the snake_case
// `DiscoverCard` shape used by legacy consumers (use-discover hook, screen).

export function discoverProfileToCard(p: DiscoverProfile): DiscoverCard {
  return {
    profile_id: p.profileId,
    user_id: p.userId,
    chosen_name: p.chosenName,
    gender: p.gender,
    age: p.age,
    city: p.city,
    bio: p.bio,
    dating_status: p.datingStatus,
    interests: p.interests,
    first_photo: p.firstPhoto,
    wing_note: p.wingNote,
    suggested_by: p.suggestedBy,
    suggester_name: p.suggesterName,
  };
}

// ── Wing pool (wingperson's WingSwipe screen) ─────────────────────────────────

/**
 * Fetch profiles the wingperson can browse on behalf of a dater.
 * Uses the dater's preferences; excludes profiles the dater already decided on.
 * RLS on decisions enforces the active relationship — this call is safe to make
 * from any authenticated session.
 */
export async function getWingPool(
  wingerId: string,
  daterId: string,
  pageSize = 20,
  pageOffset = 0
): Promise<{ data: WingCard[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_wing_pool', {
    winger_id: wingerId,
    dater_id: daterId,
    page_size: pageSize,
    page_offset: pageOffset,
  });
  return { data: data as WingCard[] | null, error };
}

// ── Winger tab list ───────────────────────────────────────────────────────────

/**
 * Returns the distinct list of wingers who have pending suggestions for the dater.
 * Used to build the tab bar: ["For You", "Emma", "Josh", "All"].
 *
 * This is a lightweight query — just names + IDs, no profile data.
 */
export async function getActiveWingerTabs(daterId: string) {
  return supabase
    .from('decisions')
    .select(
      `
      suggested_by,
      winger:profiles!decisions_suggested_by_fkey (id, chosen_name)
    `
    )
    .eq('actor_id', daterId)
    .is('decision', null)
    .not('suggested_by', 'is', null);
}

export type WingerTab = { id: string; name: string };

// ── Likes You pool (dater's "Likes You" tab) ──────────────────────────────────

export async function getLikesYouPool(
  viewerId: string,
  pageSize = 20,
  pageOffset = 0
): Promise<{ data: DiscoverCard[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_likes_you_pool', {
    viewer_id: viewerId,
    page_size: pageSize,
    page_offset: pageOffset,
  });
  return { data: data as DiscoverCard[] | null, error };
}

export async function getLikesYouCount(
  viewerId: string
): Promise<{ data: number | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_likes_you_count', {
    viewer_id: viewerId,
  });
  return { data: data as number | null, error };
}

/**
 * Suspense-ready version of getActiveWingerTabs.
 * Deduplication logic lives here (CLAUDE.md: transforms belong in the query function).
 */
export async function getWingerTabs(daterId: string): Promise<WingerTab[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select(`suggested_by, winger:profiles!decisions_suggested_by_fkey (id, chosen_name)`)
    .eq('actor_id', daterId)
    .is('decision', null)
    .not('suggested_by', 'is', null);

  if (error || !data) return [];
  const seen = new Set<string>();
  const distinct: WingerTab[] = [];
  for (const row of data) {
    const winger = row.winger as { id: string; chosen_name: string } | null;
    if (winger && !seen.has(winger.id)) {
      seen.add(winger.id);
      distinct.push({ id: winger.id, name: winger.chosen_name });
    }
  }
  return distinct;
}

export function useLikesYouCount(userId: string) {
  return useSuspenseQuery({
    queryKey: ['likes-you-count', userId],
    queryFn: async () => {
      const { data, error } = await getLikesYouCount(userId);
      if (error) throw error;
      return data ?? 0;
    },
    staleTime: 60_000,
  });
}

export function useWingerTabs(userId: string) {
  return useSuspenseQuery({
    queryKey: ['winger-tabs', userId],
    queryFn: () => getWingerTabs(userId),
    staleTime: 5 * 60_000,
  });
}

export function useInitialPool(
  userId: string,
  mode: 'likesYou' | 'discover',
  wingerId: string | null,
  pageSize: number,
  wingerOnly = false
) {
  return useSuspenseQuery({
    queryKey: ['pool', userId, mode, wingerId, wingerOnly],
    queryFn: async () => {
      if (mode === 'likesYou') {
        const { data, error } = await getLikesYouPool(userId, pageSize, 0);
        if (error) throw error;
        return data ?? [];
      }
      const res = await getApiDiscover({
        filterWingerId: wingerId ?? undefined,
        pageSize,
        pageOffset: 0,
        wingerOnly,
      });
      if (res.status !== 200) throw new Error(`Unexpected status ${res.status}`);
      return res.data.map(discoverProfileToCard);
    },
    staleTime: 0,
  });
}

export function useWingPool(wingerId: string, daterId: string, pageSize: number) {
  return useSuspenseQuery({
    queryKey: ['wing-pool', wingerId, daterId],
    queryFn: async () => {
      const { data, error } = await getWingPool(wingerId, daterId, pageSize, 0);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 0,
  });
}
