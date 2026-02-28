import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type MessageRow = Database['public']['Tables']['messages']['Row'];

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Initial load for the chat screen. Returns up to `limit` messages in
 * chronological order. For older history, increase offset.
 */
export function getMessages(matchId: string, limit = 50, offset = 0) {
  return supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, chosen_name)')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
}

export type MessageWithSender = NonNullable<
  Awaited<ReturnType<typeof getMessages>>['data']
>[number];

/**
 * Conversation list query for the Messages screen.
 * Returns the most recent message per match, plus unread count for the viewer.
 *
 * Note: Supabase JS doesn't support window functions natively, so we fetch
 * matches with their last message via a nested select + order + limit:1.
 */
export function getConversations(userId: string) {
  return supabase
    .from('matches')
    .select(
      `
      id, created_at,
      user_a:profiles!matches_user_a_id_fkey (id, chosen_name),
      user_b:profiles!matches_user_b_id_fkey (id, chosen_name),
      messages (id, body, created_at, sender_id, is_read)
    `
    )
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' })
    .order('created_at', { ascending: false });
}

export type ConversationRow = NonNullable<
  Awaited<ReturnType<typeof getConversations>>['data']
>[number];

// ── Write ─────────────────────────────────────────────────────────────────────

export function sendMessage(matchId: string, senderId: string, body: string) {
  return supabase.from('messages').insert({ match_id: matchId, sender_id: senderId, body });
}

/**
 * Mark all messages in a match as read for the current user (i.e. messages
 * where sender_id ≠ userId and is_read = false).
 */
export function markMessagesRead(matchId: string, viewerId: string) {
  return supabase
    .from('messages')
    .update({ is_read: true })
    .eq('match_id', matchId)
    .eq('is_read', false)
    .neq('sender_id', viewerId);
}

// ── Real-time ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to new messages in a match. Call .unsubscribe() on the returned
 * channel when the Chat screen unmounts.
 *
 * Usage:
 *   const channel = subscribeToMessages(matchId, (payload) => {
 *     setMessages(prev => [...prev, payload.new as MessageRow]);
 *   });
 *   return () => { channel.unsubscribe(); };
 */
export function subscribeToMessages(
  matchId: string,
  onInsert: (payload: RealtimePostgresChangesPayload<MessageRow>) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:match:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      onInsert
    )
    .subscribe();
}
