import React, { useMemo } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth';
import { useGetApiConversationsSuspense } from '@/lib/api/generated/messages/messages';
import type { Conversation } from '@/lib/api/generated/model';
import { getInitials } from '@/components/profile/profile-helpers';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { LargeHeader } from '@/components/ui/LargeHeader';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { colors } from '@/constants/theme';
import { useMessagesListPresence } from '@/hooks/use-messages-list-presence';
import { View, Text, Pressable, SafeAreaView } from '@/lib/tw';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  convo: Conversation;
  userId: string;
  onlineIds: Set<string>;
  onPress: () => void;
};

function ConvoRow({ convo, userId, onlineIds, onPress }: ConvoRowProps) {
  const { other, lastMessage } = convo;
  const isUnread = lastMessage != null && lastMessage.senderId !== userId && !lastMessage.isRead;
  const initials = getInitials(other.chosenName);
  const isOnline = onlineIds.has(other.id);

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
            {other.chosenName ?? 'Someone'}
          </Text>
          {lastMessage != null && (
            <Text className="text-xs text-fg-ghost">{relativeTime(lastMessage.createdAt)}</Text>
          )}
        </View>
        {lastMessage != null ? (
          <Text
            className={`text-sm ${isUnread ? 'text-fg font-medium' : 'text-fg-muted'}`}
            numberOfLines={1}
          >
            {lastMessage.senderId === userId ? 'You: ' : ''}
            {lastMessage.body}
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
  data: Conversation[];
};

type ContentProps = {
  userId: string;
  onlineIds: Set<string>;
};

function MessagesContent({ userId, onlineIds }: ContentProps) {
  const { data: convos, refetch, isRefetching } = useGetApiConversationsSuspense();

  const sections: Section[] = useMemo(() => {
    const active = convos.filter((c) => c.lastMessage != null);
    const starters = convos.filter((c) => c.lastMessage == null);
    const result: Section[] = [];
    if (active.length > 0) result.push({ title: 'Conversations', data: active });
    if (starters.length > 0) result.push({ title: 'New Matches', data: starters });
    return result;
  }, [convos]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.matchId}
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
            router.push({
              pathname: '/(tabs)/messages/[matchId]',
              params: {
                matchId: item.matchId,
                otherName: item.other.chosenName ?? '',
                otherUserId: item.other.id,
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
