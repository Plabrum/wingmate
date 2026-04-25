// TRANSITIONAL: this file is being drained. The long-term end state is zero wrapper
// functions here — screens import generated hooks from `@/lib/api/generated/` directly.
// What remains below is the pre-migration surface:
//   • Discover pool + Likes You + Wing pool: PORTED — generated hooks are called at the
//     callsite; only the `discoverProfileToCard` / `wingProfileToCard` shape-bridges
//     still live here. They die when `DiscoverCard` / `WingCard` are replaced by the
//     camelCase Orval models at the callsites.
// Do not add new helpers here. New endpoints go on the `api` function.

import type { Enums } from '@/types/database';
import type { DiscoverProfile, WingProfile } from '@/lib/api/generated/model';

// Shape returned by the legacy get_discover_pool / get_wing_pool RPCs.
// Kept as the in-app card shape until the camelCase sweep lands.
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
// Backed by the `api` edge function (see supabase/functions/api/domains/discover/).
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
// Backed by the `api` edge function (see supabase/functions/api/domains/wing-pool/).
// Call `getApiWingPool` from `@/lib/api/generated/wing-pool/wing-pool` directly at the
// callsite; `wingProfileToCard` maps the camelCase response to the snake_case
// `WingCard` shape used by legacy consumers (use-wing-swipe hook, screen).

export function wingProfileToCard(p: WingProfile): WingCard {
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
  };
}
