import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { useAuth } from '@/context/auth';
import { useMessages } from '@/hooks/use-messages';
import { usePresence } from '@/hooks/use-presence';
import { getInitials } from '@/components/profile/profile-helpers';
import { NavHeader } from '@/components/ui/NavHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
          isMine ? 'bg-lavender rounded-br-[4px]' : 'bg-white rounded-bl-[4px]',
          isOptimistic && 'opacity-65'
        )}
      >
        <Text className="text-15 leading-[21px] text-ink">{body}</Text>
      </Pressable>
      {showTime && (
        <Text
          className={cn(
            'text-11 text-ink-ghost mt-[3px] mx-1',
            isMine ? 'text-right' : 'text-left'
          )}
        >
          {formatTimestamp(createdAt)}
        </Text>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { matchId, otherName, otherUserId } = useLocalSearchParams<{
    matchId: string;
    otherName?: string;
    otherUserId?: string;
  }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const { messages, loading, error, send, reload } = useMessages(matchId);
  const isOnline = usePresence(otherUserId ?? null, userId);

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

  const headerTitle = otherName ?? 'Chat';
  const initials = getInitials(otherName ?? null);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <NavHeader
        back
        onBack={() => router.back()}
        title={headerTitle}
        right={
          <View className="w-8 h-8 rounded-2xl bg-purple-soft items-center justify-center">
            <Text className="text-12 font-bold text-purple">{initials}</Text>
            {isOnline && (
              <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-[5px] bg-green border-2 border-canvas" />
            )}
          </View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        {loading ? (
          <View className="flex-1 items-center justify-center p-8 gap-3">
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : error != null ? (
          <View className="flex-1 items-center justify-center p-8 gap-3">
            <Text className="text-15 text-ink-mid text-center">{error}</Text>
            <Pressable className="py-2 px-4" onPress={reload}>
              <Text className="text-14 font-semibold text-purple">Try again</Text>
            </Pressable>
          </View>
        ) : (
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
                <Text className="text-15 text-ink-mid text-center">
                  Say hello to {otherName ?? 'your match'}!
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                body={item.body}
                isMine={item.sender_id === userId}
                createdAt={item.created_at}
                isOptimistic={item.id.startsWith('temp-')}
              />
            )}
          />
        )}

        {/* Input bar */}
        <View
          className="flex-row items-end px-3 py-2 pb-4 bg-white gap-2"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }}
        >
          <Controller
            control={control}
            name="message"
            render={({ field: { value, onChange } }) => (
              <TextInput
                className="flex-1 bg-muted rounded-[20px] px-4 py-[9px] text-15 text-ink"
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
              'w-9 h-9 rounded-[18px] bg-purple items-center justify-center',
              (!messageValue.trim() || isSubmitting) && 'opacity-40'
            )}
            onPress={onSubmit}
            disabled={!messageValue.trim() || isSubmitting}
            hitSlop={8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <IconSymbol name="arrow.up" size={18} color={colors.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
