import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth';
import {
  getMessages,
  markMessagesRead,
  sendMessage,
  subscribeToMessages,
  type MessageWithSender,
} from '@/queries/messages';

export function useMessages(matchId: string) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track optimistic IDs so we can replace them when the real row arrives
  const optimisticIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getMessages(matchId);
      if (err) throw err;
      setMessages(data ?? []);
      await markMessagesRead(matchId, userId);
    } catch {
      setError("Couldn't load messages.");
    } finally {
      setLoading(false);
    }
  }, [matchId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = subscribeToMessages(matchId, (payload) => {
      const incoming = payload.new as MessageWithSender;

      setMessages((prev) => {
        // If this is the echo of an optimistic message, replace it
        if (incoming.sender_id === userId && optimisticIds.current.size > 0) {
          const firstOptimistic = [...optimisticIds.current][0];
          optimisticIds.current.delete(firstOptimistic);
          return prev.map((m) => (m.id === firstOptimistic ? incoming : m));
        }
        // Avoid duplicates (e.g. if initial load raced with subscription)
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });

      // Mark as read if the other person sent it
      if (incoming.sender_id !== userId) {
        markMessagesRead(matchId, userId);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, userId]);

  const send = useCallback(
    async (body: string) => {
      if (!body.trim()) return;

      const tempId = `temp-${Date.now()}`;
      optimisticIds.current.add(tempId);

      const optimistic: MessageWithSender = {
        id: tempId,
        match_id: matchId,
        sender_id: userId,
        body: body.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
        sender: { id: userId, chosen_name: null },
      };

      setMessages((prev) => [...prev, optimistic]);

      const { error: err } = await sendMessage(matchId, userId, body.trim());
      if (err) {
        // Roll back the optimistic bubble
        optimisticIds.current.delete(tempId);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [matchId, userId]
  );

  return { messages, loading, error, send, reload: load };
}
