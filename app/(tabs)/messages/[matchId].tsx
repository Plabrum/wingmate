import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/context/auth';
import { useMessages } from '@/hooks/use-messages';
import { usePresence } from '@/hooks/use-presence';
import { getConversations, type ConversationRow } from '@/queries/messages';
import { getInitials } from '@/components/profile/profile-helpers';
import { NavHeader } from '@/components/ui/NavHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors } from '@/constants/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOtherParticipant(convo: ConversationRow, userId: string) {
  const a = Array.isArray(convo.user_a) ? convo.user_a[0] : convo.user_a;
  const b = Array.isArray(convo.user_b) ? convo.user_b[0] : convo.user_b;
  return a?.id === userId ? b : a;
}

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
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowTime((v) => !v)}
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          isOptimistic && styles.bubbleOptimistic,
        ]}
      >
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
          {body}
        </Text>
      </TouchableOpacity>
      {showTime && (
        <Text style={[styles.timestamp, isMine ? styles.timestampRight : styles.timestampLeft]}>
          {formatTimestamp(createdAt)}
        </Text>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const { messages, loading, error, send, reload } = useMessages(matchId);

  const [otherName, setOtherName] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const isOnline = usePresence(otherUserId, userId);

  const listRef = useRef<FlatList>(null);

  // Resolve the other person's name from the conversations query
  useEffect(() => {
    if (!userId || !matchId) return;
    getConversations(userId).then(({ data }) => {
      const convo = data?.find((c) => c.id === matchId);
      if (!convo) return;
      const other = getOtherParticipant(convo, userId);
      setOtherName(other?.chosen_name ?? null);
      setOtherUserId(other?.id ?? null);
    });
  }, [userId, matchId]);

  // Scroll to bottom when messages load or a new one arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);
    await send(text);
    setSending(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, sending, send]);

  const headerTitle = otherName ?? 'Chat';
  const initials = getInitials(otherName);

  return (
    <SafeAreaView style={styles.canvas} edges={['top']}>
      <NavHeader
        back
        onBack={() => router.back()}
        title={headerTitle}
        right={
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
            {isOnline && <View style={styles.onlineDot} />}
          </View>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : error != null ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reload}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
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
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message…"
            placeholderTextColor={colors.inkGhost}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDim]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            hitSlop={8}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <IconSymbol name="arrow.up" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple,
  },

  // Header avatar
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.purple,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.canvas,
  },

  // List
  listContent: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
  },

  // Bubbles
  bubbleWrap: {
    marginVertical: 2,
    maxWidth: '78%',
  },
  bubbleWrapRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleWrapLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  bubbleMine: {
    backgroundColor: colors.lavender,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
  },
  bubbleOptimistic: {
    opacity: 0.65,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: colors.ink,
  },
  bubbleTextTheirs: {
    color: colors.ink,
  },
  timestamp: {
    fontSize: 11,
    color: colors.inkGhost,
    marginTop: 3,
    marginHorizontal: 4,
  },
  timestampRight: {
    textAlign: 'right',
  },
  timestampLeft: {
    textAlign: 'left',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.white,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: colors.ink,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDim: {
    opacity: 0.4,
  },
});
