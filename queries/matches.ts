import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/queries/photos';

// ── Match list ────────────────────────────────────────────────────────────────

/**
 * Load all matches for the current user with the other person's profile data.
 * Used by the Matches grid screen.
 *
 * Because user_a_id < user_b_id is enforced, we need to check both columns
 * and union, or use Supabase's or() filter.
 */
export async function getMatches(userId: string) {
  return supabase
    .from('matches')
    .select(
      `
      id, created_at,
      user_a:profiles!matches_user_a_id_fkey (
        id, chosen_name, date_of_birth,
        dating_profiles (city, bio, interests,
          profile_photos (storage_url, display_order, approved_at)
        )
      ),
      user_b:profiles!matches_user_b_id_fkey (
        id, chosen_name, date_of_birth,
        dating_profiles (city, bio, interests,
          profile_photos (storage_url, display_order, approved_at)
        )
      ),
      messages (id)
    `
    )
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { ascending: false });
}

export type MatchRow = NonNullable<Awaited<ReturnType<typeof getMatches>>['data']>[number];

/**
 * Helper: given a match row and the current userId, return the other person's data.
 */
export function getOtherProfile(match: MatchRow, currentUserId: string) {
  return match.user_a.id === currentUserId ? match.user_b : match.user_a;
}

/**
 * Helper: return the first approved photo from a profile's dating_profiles.
 * Falls back to null if no approved photo exists.
 */
export function getFirstPhoto(profile: MatchRow['user_a'] | MatchRow['user_b']): string | null {
  const dp = profile.dating_profiles;
  const singleDp = Array.isArray(dp) ? dp[0] : dp;
  type Photo = { storage_url: string; display_order: number; approved_at: string | null };
  const photos: Photo[] = (singleDp?.profile_photos ?? []) as Photo[];
  const approved = photos
    .filter((p) => p.approved_at !== null)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  return getPhotoUrl(approved[0]?.storage_url ?? null);
}

/**
 * Check if a match has any messages yet (used to split Matches vs
 * "Start a conversation" sections in the Messages screen).
 */
export function hasMessages(match: MatchRow): boolean {
  return (match.messages?.length ?? 0) > 0;
}

// ── Sheet data types ──────────────────────────────────────────────────────────

export type Prompt = {
  id: string;
  answer: string;
  template: { question: string } | null;
};

export type WingNote = {
  note: string | null;
  suggested_by: string | null;
  winger: { chosen_name: string | null } | null;
};

// ── Match prompts ─────────────────────────────────────────────────────────────

/**
 * Fetch profile prompts for the other person in a match.
 * Lazy-loaded when the preview sheet opens.
 */
export function getMatchPrompts(otherUserId: string) {
  return supabase
    .from('dating_profiles')
    .select(
      `
      profile_prompts (
        id, answer,
        template:prompt_templates (question)
      )
    `
    )
    .eq('user_id', otherUserId)
    .order('created_at', { referencedTable: 'profile_prompts', ascending: true })
    .maybeSingle();
}

// ── Combined sheet data ───────────────────────────────────────────────────────

export async function getMatchSheetData(userId: string, otherUserId: string) {
  const [noteResult, promptResult] = await Promise.all([
    getWingNoteForMatch(userId, otherUserId),
    getMatchPrompts(otherUserId),
  ]);
  if (noteResult.error) throw new Error(noteResult.error.message);
  if (promptResult.error) throw new Error(promptResult.error.message);

  const dp = promptResult.data;
  const raw = dp?.profile_prompts ?? [];
  const prompts = (Array.isArray(raw) ? raw : [raw]) as Prompt[];
  return { wingNote: noteResult.data as WingNote | null, prompts };
}

export function useMatchesData(userId: string) {
  return useSuspenseQuery({
    queryKey: ['matches', userId],
    queryFn: async () => {
      const { data, error } = await getMatches(userId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useMatchSheetData(userId: string, otherId: string) {
  return useSuspenseQuery({
    queryKey: ['match-sheet', userId, otherId],
    queryFn: () => getMatchSheetData(userId, otherId),
    staleTime: 10 * 60_000,
  });
}

// ── Wing note on a match ──────────────────────────────────────────────────────

/**
 * Fetch the wing note (if any) that was attached to the decision that led to
 * this match. Shown in the match preview sheet.
 */
export async function getWingNoteForMatch(userId: string, otherUserId: string) {
  return supabase
    .from('decisions')
    .select('note, suggested_by, winger:profiles!decisions_suggested_by_fkey(chosen_name)')
    .eq('actor_id', userId)
    .eq('recipient_id', otherUserId)
    .not('note', 'is', null)
    .maybeSingle();
}
