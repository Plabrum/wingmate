import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ── Own profile ───────────────────────────────────────────────────────────────

/**
 * Load the current user's base profile.
 * Used by ProfileContext on mount and after onboarding steps.
 */
export function getOwnProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

/**
 * Load the current user's full dating profile with nested photos and prompts.
 * Used by the Profile screen (all 3 tabs) and the profile context.
 */
export function getOwnDatingProfile(userId: string) {
  return supabase
    .from('dating_profiles')
    .select(
      `
      *,
      photos:profile_photos (
        id, storage_url, display_order, approved_at, suggester_id,
        suggester:profiles!profile_photos_suggester_id_fkey (id, chosen_name)
      ),
      prompts:profile_prompts (
        id, answer, created_at,
        template:prompt_templates (id, question),
        responses:prompt_responses (
          id, message, is_approved, user_id, created_at,
          author:profiles!prompt_responses_user_id_fkey (id, chosen_name)
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('display_order', { referencedTable: 'profile_photos', ascending: true })
    .order('created_at', { referencedTable: 'profile_prompts', ascending: true })
    .maybeSingle();
}

export type OwnDatingProfile = NonNullable<
  Awaited<ReturnType<typeof getOwnDatingProfile>>['data']
>;

// ── Onboarding writes ─────────────────────────────────────────────────────────

/** Step 1: write name, DOB, phone, gender, role collected during onboarding. */
export function updateBaseProfile(
  userId: string,
  data: Pick<ProfileRow, 'chosen_name' | 'date_of_birth' | 'phone_number' | 'gender' | 'role'>
) {
  return supabase.from('profiles').update(data).eq('id', userId);
}

/**
 * Step 2 (daters): create the dating_profiles row.
 * Called once at the end of the onboarding photo/prompt step.
 */
export function createDatingProfile(data: {
  user_id: string;
  city: string;
  bio?: string;
  age_from: number;
  age_to?: number;
  interested_gender: string[];
  religion: string;
  religious_preference?: string;
  interests: string[];
  dating_status?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('dating_profiles').insert(data as any).select().single();
}

// ── Profile edits ─────────────────────────────────────────────────────────────

/** Update mutable dating profile fields from the Edit Profile screen. */
export function updateDatingProfile(
  userId: string,
  data: {
    bio?: string;
    city?: string;
    age_from?: number;
    age_to?: number | null;
    interested_gender?: string[];
    religion?: string;
    religious_preference?: string | null;
    interests?: string[];
    dating_status?: string;
    is_active?: boolean;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('dating_profiles').update(data as any).eq('user_id', userId);
}
