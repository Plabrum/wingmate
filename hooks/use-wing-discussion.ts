import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth';
import {
  getWingDiscussionMessages,
  markWingDiscussionRead,
  sendWingDiscussionMessage,
  subscribeToWingDiscussionMessages,
  type WingDiscussionMessage,
} from '@/queries/wing-discussions';

export function useWingDiscussion(discussionId: string) {
  const { userId } = useAuth();

  const [messages, setMessages] = useState<WingDiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const optimisticIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!discussionId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getWingDiscussionMessages(discussionId);
      if (err) throw err;
      setMessages(data ?? []);
      await markWingDiscussionRead(discussionId, userId);
    } catch {
      setError("Couldn't load messages.");
    } finally {
      setLoading(false);
    }
  }, [discussionId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Acceptable exception: mount-only guard for a genuine external event.
  useEffect(() => {
    if (!discussionId) return;

    const channel = subscribeToWingDiscussionMessages(discussionId, (payload) => {
      const incoming = payload.new as WingDiscussionMessage;

      setMessages((prev) => {
        if (incoming.sender_id === userId && optimisticIds.current.size > 0) {
          const firstOptimistic = [...optimisticIds.current][0];
          optimisticIds.current.delete(firstOptimistic);
          return prev.map((m) => (m.id === firstOptimistic ? incoming : m));
        }
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });

      if (incoming.sender_id !== userId) {
        markWingDiscussionRead(discussionId, userId);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [discussionId, userId]);

  const send = useCallback(
    async (body: string) => {
      if (!body.trim()) return;

      const tempId = `temp-${Date.now()}`;
      optimisticIds.current.add(tempId);

      const optimistic: WingDiscussionMessage = {
        id: tempId,
        discussion_id: discussionId,
        sender_id: userId,
        body: body.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
        sender: { id: userId, chosen_name: null },
      };

      setMessages((prev) => [...prev, optimistic]);

      const { error: err } = await sendWingDiscussionMessage(discussionId, userId, body.trim());
      if (err) {
        optimisticIds.current.delete(tempId);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [discussionId, userId]
  );

  return { messages, loading, error, send, reload: load };
}
