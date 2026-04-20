import { useSuspenseQuery } from '@tanstack/react-query';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type WingDiscussionMessageRow = Database['public']['Tables']['wing_discussion_messages']['Row'];

// ── Read ──────────────────────────────────────────────────────────────────────

export function getWingDiscussionMessages(discussionId: string, limit = 100) {
  return supabase
    .from('wing_discussion_messages')
    .select('*, sender:profiles!wing_discussion_messages_sender_id_fkey(id, chosen_name)')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true })
    .limit(limit);
}

export type WingDiscussionMessage = NonNullable<
  Awaited<ReturnType<typeof getWingDiscussionMessages>>['data']
>[number];

/**
 * Returns all active discussions for a user (as dater or winger), with the
 * suggested profile's name/photo, the other participant's name, and unread count.
 */
export function getWingDiscussions(userId: string) {
  return supabase
    .from('wing_discussions')
    .select(
      `
      id, decision_id, dater_id, winger_id, created_at,
      suggested_profile:profiles!wing_discussions_suggested_profile_id_fkey (id, chosen_name, avatar_url),
      dater:profiles!wing_discussions_dater_id_fkey (id, chosen_name, avatar_url),
      winger:profiles!wing_discussions_winger_id_fkey (id, chosen_name, avatar_url),
      wing_discussion_messages (id, body, created_at, sender_id, is_read)
    `
    )
    .or(`dater_id.eq.${userId},winger_id.eq.${userId}`)
    .order('created_at', { referencedTable: 'wing_discussion_messages', ascending: false })
    .limit(1, { referencedTable: 'wing_discussion_messages' })
    .order('created_at', { ascending: false });
}

export type WingDiscussionRow = NonNullable<
  Awaited<ReturnType<typeof getWingDiscussions>>['data']
>[number];

export function useWingDiscussions(userId: string) {
  return useSuspenseQuery({
    queryKey: [getWingDiscussions, userId],
    queryFn: async () => {
      const { data, error } = await getWingDiscussions(userId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a discussion thread for a suggestion. Returns the discussion id.
 * Safe to call multiple times — the unique constraint on decision_id ensures
 * only one thread per suggestion is ever created.
 */
export async function getOrCreateWingDiscussion(
  decisionId: string,
  daterId: string,
  wingerId: string,
  suggestedProfileId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('wing_discussions')
    .upsert(
      {
        decision_id: decisionId,
        dater_id: daterId,
        winger_id: wingerId,
        suggested_profile_id: suggestedProfileId,
      },
      { onConflict: 'decision_id', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (error) {
    // If the upsert failed (e.g. duplicate key race), fall back to a select
    const { data: existing } = await supabase
      .from('wing_discussions')
      .select('id')
      .eq('decision_id', decisionId)
      .single();
    return existing?.id ?? null;
  }
  return data?.id ?? null;
}

export function sendWingDiscussionMessage(discussionId: string, senderId: string, body: string) {
  return supabase
    .from('wing_discussion_messages')
    .insert({ discussion_id: discussionId, sender_id: senderId, body });
}

export function markWingDiscussionRead(discussionId: string, viewerId: string) {
  return supabase
    .from('wing_discussion_messages')
    .update({ is_read: true })
    .eq('discussion_id', discussionId)
    .eq('is_read', false)
    .neq('sender_id', viewerId);
}

// ── Real-time ─────────────────────────────────────────────────────────────────

export function subscribeToWingDiscussionMessages(
  discussionId: string,
  onInsert: (payload: RealtimePostgresChangesPayload<WingDiscussionMessageRow>) => void
): RealtimeChannel {
  return supabase
    .channel(`wing-discussion:${discussionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'wing_discussion_messages',
        filter: `discussion_id=eq.${discussionId}`,
      },
      onInsert
    )
    .subscribe();
}
