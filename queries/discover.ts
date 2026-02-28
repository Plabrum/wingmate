import { supabase } from '@/lib/supabase';

// Shape returned by the get_discover_pool and get_wing_pool RPCs.
// Keep in sync with the function return types in the migration.
export type DiscoverCard = {
  profile_id: string;
  user_id: string;
  chosen_name: string;
  gender: 'Male' | 'Female' | 'Non-Binary' | null;
  age: number;
  city: string;
  bio: string | null;
  dating_status: 'open' | 'break' | 'winging';
  interests: string[];
  first_photo: string | null;
  // Present when the card comes from a wingperson suggestion:
  wing_note: string | null;
  suggested_by: string | null;
  suggester_name: string | null;
};

export type WingCard = Omit<DiscoverCard, 'wing_note' | 'suggested_by' | 'suggester_name'>;

// ── Discover pool (dater's Discover screen) ───────────────────────────────────

/**
 * Fetch the next page of cards for the Discover feed.
 *
 * filterWingerId — when set, restricts to pending suggestions from that winger
 *                  (used for the per-winger tabs, e.g. "Emma").
 *                  Pass null for "For You" and "All" tabs.
 *
 * Pagination: call repeatedly with increasing pageOffset as the user swipes.
 * Recommended: prefetch the next page when the user reaches the last 3 cards.
 */
export async function getDiscoverPool(
  viewerId: string,
  filterWingerId: string | null = null,
  pageSize = 20,
  pageOffset = 0
): Promise<{ data: DiscoverCard[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_discover_pool', {
    viewer_id: viewerId,
    filter_winger_id: filterWingerId,
    page_size: pageSize,
    page_offset: pageOffset,
  });
  return { data: data as DiscoverCard[] | null, error };
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
