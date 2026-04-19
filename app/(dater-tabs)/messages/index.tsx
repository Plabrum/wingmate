import React, { useMemo } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth';
import { useConversationsData, type ConversationRow } from '@/queries/messages';
import { getInitials } from '@/components/profile/profile-helpers';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { LargeHeader } from '@/components/ui/LargeHeader';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { colors } from '@/constants/theme';
import { useMessagesListPresence } from '@/hooks/use-messages-list-presence';
import { View, Text, Pressable, SafeAreaView } from '@/lib/tw';

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
  const isUnread = lastMsg != null && lastMsg.sender_id !== userId && !lastMsg.is_read;
  const initials = getInitials(other?.chosen_name);
  const isOnline = other?.id != null && onlineIds.has(other.id);

  return (
    <Pressable className="flex-row items-center px-4 py-3 bg-white" onPress={onPress}>
      <View className="relative mr-3">
        <FaceAvatar initials={initials} size={48} />
        {isUnread && (
          <View className="absolute bottom-0 right-0 w-3 h-3 rounded-[6px] bg-accent border-2 border-white" />
        )}
        {isOnline && (
          <View className="absolute top-0 right-0 w-3 h-3 rounded-[6px] bg-green-500 border-2 border-white" />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-0.5">
          <Text
            className={`flex-1 text-sm text-fg mr-2 ${isUnread ? 'font-bold' : 'font-medium'}`}
            numberOfLines={1}
          >
            {other?.chosen_name ?? 'Someone'}
          </Text>
          {lastMsg != null && (
            <Text className="text-xs text-fg-ghost">{relativeTime(lastMsg.created_at)}</Text>
          )}
        </View>
        {lastMsg != null ? (
          <Text
            className={`text-sm ${isUnread ? 'text-fg font-medium' : 'text-fg-muted'}`}
            numberOfLines={1}
          >
            {lastMsg.sender_id === userId ? 'You: ' : ''}
            {lastMsg.body}
          </Text>
        ) : (
          <Text className="text-sm text-fg-ghost italic">New match — say hello!</Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View className="flex-row items-center px-4 py-3 bg-white gap-3">
      <View className="w-12 h-12 rounded-3xl bg-separator" />
      <View className="flex-1 gap-2">
        <View className="h-3.5 rounded-[7px] bg-separator w-[70%]" />
        <View className="h-3.5 rounded-[7px] bg-separator w-[45%]" />
      </View>
    </View>
  );
}

// ── MessagesContent ───────────────────────────────────────────────────────────

type Section = {
  title: string;
  data: ConversationRow[];
};

type ContentProps = {
  userId: string;
  onlineIds: Set<string>;
};

function MessagesContent({ userId, onlineIds }: ContentProps) {
  const { data: convos, refetch, isRefetching } = useConversationsData(userId);

  const sections: Section[] = useMemo(() => {
    const active = convos.filter(hasMessages);
    const starters = convos.filter((c) => !hasMessages(c));
    const result: Section[] = [];
    if (active.length > 0) result.push({ title: 'Conversations', data: active });
    if (starters.length > 0) result.push({ title: 'New Matches', data: starters });
    return result;
  }, [convos]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListHeaderComponent={<LargeHeader title="Messages" />}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center p-10 pt-20">
          <Text className="text-sm text-fg-muted text-center leading-[22px]">
            No conversations yet. Start one from your Matches.
          </Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View className="px-4 pt-5 pb-1.5 bg-page">
          <Text className="text-xs font-bold tracking-[0.8px] text-fg-subtle uppercase">
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <ConvoRow
          convo={item}
          userId={userId}
          onlineIds={onlineIds}
          onPress={() => {
            const other = getOtherParticipant(item, userId);
            router.push({
              pathname: '/(dater-tabs)/messages/[matchId]',
              params: {
                matchId: item.id,
                otherName: other?.chosen_name ?? '',
                otherUserId: other?.id ?? '',
              },
            } as never);
          }}
        />
      )}
      ItemSeparatorComponent={() => (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.divider,
            marginLeft: 76,
          }}
        />
      )}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { userId } = useAuth();
  const onlineIds = useMessagesListPresence(userId);

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <ScreenSuspense
        fallback={
          <>
            <LargeHeader title="Messages" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        }
      >
        <MessagesContent userId={userId} onlineIds={onlineIds} />
      </ScreenSuspense>
    </SafeAreaView>
  );
}
