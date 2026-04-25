// TRANSITIONAL: this file is being drained. The long-term end state is zero wrapper
// functions here — screens import generated hooks from `@/lib/api/generated/` directly.
// What remains below is the pre-migration surface:
//   • Discover pool + Likes You: PORTED — generated hooks are called at the callsite;
//     only the `discoverProfileToCard` shape-bridge still lives here. Dies when
//     `DiscoverCard` is replaced by `DiscoverProfile` (camelCase) at the callsites.
//   • Wing pool: NOT YET PORTED — still on `supabase.rpc`. Port to
//     `supabase/functions/api/domains/wing-pool/` and delete its wrapper + hook from
//     this file once it moves.
// Do not add new helpers here. New endpoints go on the `api` function.

import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';
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
