import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { useAuth } from '@/context/auth';
import { useMessages } from '@/hooks/use-messages';
import { usePresence } from '@/hooks/use-presence';
import { getInitials } from '@/components/profile/profile-helpers';
import { NavHeader } from '@/components/ui/NavHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { colors } from '@/constants/theme';
import { View, Text, TextInput, Pressable, SafeAreaView } from '@/lib/tw';
import { cn } from '@/lib/cn';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

type MessageBubbleProps = {
  body: string;
  isMine: boolean;
  createdAt: string;
  isOptimistic: boolean;
};

function MessageBubble({ body, isMine, createdAt, isOptimistic }: MessageBubbleProps) {
  const [showTime, setShowTime] = useState(false);

  return (
    <View
      className={cn('my-0.5 max-w-[78%]', isMine ? 'self-end items-end' : 'self-start items-start')}
    >
      <Pressable
        onPress={() => setShowTime((v) => !v)}
        className={cn(
          'rounded-[18px] py-[9px] px-3.5',
          isMine ? 'bg-accent-muted rounded-br-[4px]' : 'bg-white rounded-bl-[4px]',
          isOptimistic && 'opacity-65'
        )}
      >
        <Text className="text-sm leading-[21px] text-fg">{body}</Text>
      </Pressable>
      {showTime && (
        <Text
          className={cn('text-xs text-fg-ghost mt-[3px] mx-1', isMine ? 'text-right' : 'text-left')}
        >
          {formatTimestamp(createdAt)}
        </Text>
      )}
    </View>
  );
}

// ── ChatBody ──────────────────────────────────────────────────────────────────

type ChatBodyProps = {
  matchId: string;
  userId: string;
  otherName: string | undefined;
};

function ChatBody({ matchId, userId, otherName }: ChatBodyProps) {
  const { messages, send } = useMessages(matchId);
  const listRef = useRef<FlatList>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<{ message: string }>({
    mode: 'onChange',
    defaultValues: { message: '' },
  });

  const messageValue = watch('message');

  const onSubmit = handleSubmit(async ({ message }) => {
    const text = message.trim();
    if (!text) return;
    reset();
    await send(text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          flexGrow: 1,
          paddingVertical: 12,
          paddingHorizontal: 12,
          gap: 4,
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-10">
            <Text className="text-sm text-fg-muted text-center">
              Say hello to {otherName ?? 'your match'}!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageBubble
            body={item.body}
            isMine={item.senderId === userId}
            createdAt={item.createdAt}
            isOptimistic={item.id.startsWith('temp-')}
          />
        )}
      />

      <View
        className="flex-row items-end px-3 py-2 pb-4 bg-white gap-2"
        style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }}
      >
        <Controller
          control={control}
          name="message"
          render={({ field: { value, onChange } }) => (
            <TextInput
              className="flex-1 bg-surface rounded-2xl px-4 py-[9px] text-sm text-fg"
              style={{ maxHeight: 120, lineHeight: 20 }}
              value={value}
              onChangeText={onChange}
              placeholder="Message…"
              placeholderTextColor={colors.inkGhost}
              multiline
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={onSubmit}
            />
          )}
        />
        <Pressable
          className={cn(
            'w-9 h-9 rounded-[18px] bg-accent items-center justify-center',
            (!messageValue.trim() || isSubmitting) && 'opacity-40'
          )}
          onPress={onSubmit}
          disabled={!messageValue.trim() || isSubmitting}
          hitSlop={8}
        >
          <IconSymbol name="arrow.up" size={18} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { matchId, otherName, otherUserId } = useLocalSearchParams<{
    matchId: string;
    otherName?: string;
    otherUserId?: string;
  }>();
  const { userId } = useAuth();
  const isOnline = usePresence(otherUserId ?? null, userId);

  const headerTitle = otherName ?? 'Chat';
  const initials = getInitials(otherName ?? null);

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <NavHeader
        back
        onBack={() => router.back()}
        title={headerTitle}
        right={
          <View className="w-8 h-8 rounded-2xl bg-accent-soft items-center justify-center">
            <Text className="text-xs font-bold text-accent">{initials}</Text>
            {isOnline && (
              <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-[5px] bg-green-500 border-2 border-page" />
            )}
          </View>
        }
      />
      <ScreenSuspense>
        <ChatBody matchId={matchId} userId={userId} otherName={otherName} />
      </ScreenSuspense>
    </SafeAreaView>
  );
}
