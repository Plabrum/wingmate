import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';

import { useWingDiscussion } from '@/hooks/use-wing-discussion';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors } from '@/constants/theme';
import { View, Text, TextInput, Pressable } from '@/lib/tw';
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

// ── Sheet content ─────────────────────────────────────────────────────────────

type SheetContentProps = {
  discussionId: string;
  currentUserId: string;
  otherParticipantName: string;
  suggestedProfile: { name: string; age: number; photoUri: string | null };
  onClose: () => void;
};

function SheetContent({
  discussionId,
  currentUserId,
  otherParticipantName,
  suggestedProfile,
  onClose,
}: SheetContentProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { messages, loading, error, send, reload } = useWingDiscussion(discussionId);

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
    <View className="flex-1 bg-page">
      {/* Header */}
      <View
        className="flex-row items-center px-4 gap-3 bg-white"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden' }}>
          <PhotoRect uri={suggestedProfile.photoUri} ratio={1} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-fg">
            {suggestedProfile.name}, {suggestedProfile.age}
          </Text>
          <Text className="text-xs text-fg-muted mt-0.5">with {otherParticipantName}</Text>
        </View>
        <Pressable
          className="w-8 h-8 rounded-full bg-surface items-center justify-center"
          onPress={onClose}
          hitSlop={8}
        >
          <IconSymbol name="xmark" size={16} color={colors.inkMid} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.purple} />
          </View>
        ) : error != null ? (
          <View className="flex-1 items-center justify-center p-8 gap-3">
            <Text className="text-sm text-fg-muted text-center">{error}</Text>
            <Pressable className="py-2 px-4" onPress={reload}>
              <Text className="text-sm font-semibold text-accent">Try again</Text>
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
                <Text className="text-sm text-fg-muted text-center">
                  Ask {otherParticipantName} about {suggestedProfile.name}.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                body={item.body}
                isMine={item.sender_id === currentUserId}
                createdAt={item.created_at}
                isOptimistic={item.id.startsWith('temp-')}
              />
            )}
          />
        )}

        {/* Input bar */}
        <View
          className="flex-row items-end px-3 py-2 bg-white gap-2"
          style={{
            paddingBottom: insets.bottom + 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.divider,
          }}
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
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <IconSymbol name="arrow.up" size={18} color={colors.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── WingDiscussionSheet ───────────────────────────────────────────────────────

export type WingDiscussionSheetProps = {
  visible: boolean;
  onClose: () => void;
  discussionId: string | null;
  currentUserId: string;
  otherParticipantName: string;
  suggestedProfile: { name: string; age: number; photoUri: string | null };
};

export function WingDiscussionSheet({
  visible,
  onClose,
  discussionId,
  currentUserId,
  otherParticipantName,
  suggestedProfile,
}: WingDiscussionSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {discussionId != null ? (
        <SheetContent
          discussionId={discussionId}
          currentUserId={currentUserId}
          otherParticipantName={otherParticipantName}
          suggestedProfile={suggestedProfile}
          onClose={onClose}
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-page">
          <ActivityIndicator color={colors.purple} />
        </View>
      )}
    </Modal>
  );
}
