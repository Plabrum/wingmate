import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { getConversations, type ConversationRow } from '@/queries/messages';
import { getInitials } from '@/components/profile/profile-helpers';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { colors } from '@/constants/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOtherParticipant(convo: ConversationRow, userId: string) {
  const a = Array.isArray(convo.user_a) ? convo.user_a[0] : convo.user_a;
  const b = Array.isArray(convo.user_b) ? convo.user_b[0] : convo.user_b;
  return a?.id === userId ? b : a;
}

function getLastMessage(convo: ConversationRow) {
  const msgs = Array.isArray(convo.messages) ? convo.messages : [];
  return msgs[0] ?? null;
}

function hasMessages(convo: ConversationRow): boolean {
  return getLastMessage(convo) != null;
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── ConvoRow ──────────────────────────────────────────────────────────────────

type ConvoRowProps = {
  convo: ConversationRow;
  userId: string;
  onlineIds: Set<string>;
  onPress: () => void;
};

function ConvoRow({ convo, userId, onlineIds, onPress }: ConvoRowProps) {
  const other = getOtherParticipant(convo, userId);
  const lastMsg = getLastMessage(convo);
  const isUnread =
    lastMsg != null && lastMsg.sender_id !== userId && !lastMsg.is_read;
  const initials = getInitials(other?.chosen_name);
  const isOnline = other?.id != null && onlineIds.has(other.id);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarWrap}>
        <FaceAvatar initials={initials} size={48} />
        {isUnread && <View style={styles.unreadDot} />}
        {isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, isUnread && styles.nameBold]} numberOfLines={1}>
            {other?.chosen_name ?? 'Someone'}
          </Text>
          {lastMsg != null && (
            <Text style={styles.time}>{relativeTime(lastMsg.created_at)}</Text>
          )}
        </View>
        {lastMsg != null ? (
          <Text
            style={[styles.preview, isUnread && styles.previewBold]}
            numberOfLines={1}
          >
            {lastMsg.sender_id === userId ? 'You: ' : ''}
            {lastMsg.body}
          </Text>
        ) : (
          <Text style={styles.previewMuted}>New match — say hello!</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={[styles.row, styles.skeletonRow]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Section = {
  title: string;
  data: ConversationRow[];
};

export default function MessagesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await getConversations(userId);
        if (err) throw err;
        setConvos(data ?? []);
      } catch {
        setError("Couldn't load conversations.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Single broad presence channel for the messages list
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('presence:messages-list', {
      config: { presence: { key: userId } },
    });
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (p.user_id !== userId) ids.add(p.user_id);
          }
        }
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId });
        }
      });

    return () => {
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [userId]);

  const sections: Section[] = React.useMemo(() => {
    const active = convos.filter(hasMessages);
    const starters = convos.filter((c) => !hasMessages(c));
    const result: Section[] = [];
    if (active.length > 0) result.push({ title: 'Conversations', data: active });
    if (starters.length > 0) result.push({ title: 'New Matches', data: starters });
    return result;
  }, [convos]);

  if (loading) {
    return (
      <SafeAreaView style={styles.canvas} edges={['top']}>
        <LargeHeader title="Messages" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.canvas} edges={['top']}>
      {error != null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListHeaderComponent={<LargeHeader title="Messages" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No conversations yet. Start one from your Matches.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ConvoRow
            convo={item}
            userId={userId}
            onlineIds={onlineIds}
            onPress={() => router.push(`/(tabs)/messages/${item.id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    flexGrow: 1,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
    backgroundColor: colors.canvas,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.inkDim,
    textTransform: 'uppercase',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.purple,
    borderWidth: 2,
    borderColor: colors.white,
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.white,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.ink,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: colors.inkGhost,
  },
  preview: {
    fontSize: 14,
    color: colors.inkMid,
  },
  previewBold: {
    color: colors.ink,
    fontWeight: '500',
  },
  previewMuted: {
    fontSize: 14,
    color: colors.inkGhost,
    fontStyle: 'italic',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 76,
  },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },

  // Skeleton
  skeletonRow: {
    gap: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.divider,
  },
  skeletonBody: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.divider,
    width: '70%',
  },
  skeletonLineShort: {
    width: '45%',
  },
});
