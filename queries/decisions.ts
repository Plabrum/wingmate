import { supabase } from '@/lib/supabase';

// ── Direct swipes ─────────────────────────────────────────────────────────────

/**
 * Record a direct like or pass from the Discover screen.
 * The create_match_if_mutual DB trigger fires after insert and creates
 * a matches row if the recipient has already approved the current user.
 */
export function recordDecision(
  actorId: string,
  recipientId: string,
  decision: 'approved' | 'declined'
) {
  return supabase
    .from('decisions')
    .insert({ actor_id: actorId, recipient_id: recipientId, decision });
}

// ── Acting on a wingperson suggestion ─────────────────────────────────────────

/**
 * Approve or decline a pending wingperson suggestion.
 * Updates the existing decisions row (decision IS NULL → 'approved'/'declined').
 * The match trigger fires on the update if decision becomes 'approved'.
 */
export function actOnSuggestion(
  actorId: string,
  recipientId: string,
  decision: 'approved' | 'declined'
) {
  return supabase
    .from('decisions')
    .update({ decision })
    .eq('actor_id', actorId)
    .eq('recipient_id', recipientId)
    .is('decision', null);
}

// ── Wingperson proxy swipe ────────────────────────────────────────────────────

/**
 * Wingperson declines on behalf of the dater (no note needed).
 * decision = 'declined' so it won't surface in the dater's feed.
 */
export function wingSuggestDecline(daterId: string, recipientId: string, wingerId: string) {
  return supabase.from('decisions').insert({
    actor_id: daterId,
    recipient_id: recipientId,
    suggested_by: wingerId,
    decision: 'declined',
  });
}

/**
 * Wingperson suggests someone for the dater (decision stays null until dater acts).
 * The note appears in the dater's Discover card for this profile.
 */
export function wingSuggestApprove(
  daterId: string,
  recipientId: string,
  wingerId: string,
  note: string | null
) {
  return supabase.from('decisions').insert({
    actor_id: daterId,
    recipient_id: recipientId,
    suggested_by: wingerId,
    decision: null,
    note,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check whether a match already exists between two users.
 * Used client-side after a like to decide whether to show the "It's a Match!" overlay.
 * (The trigger handles the DB-level insert; this is just for the UI reaction.)
 */
export function checkMutualMatch(userA: string, userB: string) {
  const a = userA < userB ? userA : userB;
  const b = userA < userB ? userB : userA;
  return supabase
    .from('matches')
    .select('id')
    .eq('user_a_id', a)
    .eq('user_b_id', b)
    .maybeSingle();
}

/**
 * Load all pending suggestions for a dater (decision IS NULL) with winger info.
 * Used to build the winger-name tabs in Discover.
 */
export function getPendingSuggestions(actorId: string) {
  return supabase
    .from('decisions')
    .select(
      `
      id, recipient_id, note, created_at,
      winger:profiles!decisions_suggested_by_fkey (id, chosen_name)
    `
    )
    .eq('actor_id', actorId)
    .is('decision', null)
    .not('suggested_by', 'is', null)
    .order('created_at', { ascending: false });
}

export type PendingSuggestion = NonNullable<
  Awaited<ReturnType<typeof getPendingSuggestions>>['data']
>[number];
