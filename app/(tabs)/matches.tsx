import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

import { View, Text, Pressable, ScrollView, TextInput, SafeAreaView } from '@/lib/tw';
import { cn } from '@/lib/cn';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import {
  useGetApiMatchesMatchIdSheetSuspense,
  useGetApiMatchesSuspense,
} from '@/lib/api/generated/matches/matches';
import type { MatchSummary } from '@/lib/api/generated/model';
import { postApiPromptResponses } from '@/lib/api/generated/prompts/prompts';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { GradientBlock } from '@/components/ui/GradientBlock';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { Pill } from '@/components/ui/Pill';
import { Sprout } from '@/components/ui/Sprout';
import { cardButtonShadow } from '@/lib/styles';

const LEAF = '#5A8C3A';
const LEAF_SOFT = '#E5EFD8';
const INK = '#1F1B16';
const INK_MUTED = '#4A4338';
const INK_SUBTLE = '#8B8170';
const PAPER = '#FBF8F1';
const CREAM = '#F5F1E8';
const LINE = 'rgba(31,27,22,0.10)';

// ── Types ─────────────────────────────────────────────────────────────────────

type PromptState = {
  open: boolean;
  text: string;
  sending: boolean;
  sent: boolean;
  error: string | null;
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon({ size = 16, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 14, color = LEAF }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l5 5L20 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchedAgo(createdAt: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  if (days === 0) return 'matched today';
  if (days === 1) return 'matched 1 day ago';
  if (days < 30) return `matched ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'matched 1 month ago' : `matched ${months} months ago`;
}

// ── MatchCard (grid cell) ─────────────────────────────────────────────────────

type MatchCardProps = {
  match: MatchSummary;
  onPress: () => void;
};

function MatchCard({ match, onPress }: MatchCardProps) {
  const { other, hasMessages } = match;
  const isNew = !hasMessages;
  const name = other.chosenName ?? 'Someone';

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          aspectRatio: 3 / 4,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: PAPER,
        },
        cardButtonShadow,
      ]}
    >
      {other.firstPhoto ? (
        <Image
          source={{ uri: other.firstPhoto }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <GradientBlock name={name} radius={0} />
        </View>
      )}

      {/* Bottom gradient scrim */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '55%',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      />

      {isNew && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: LEAF,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: PAPER,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            New
          </Text>
        </View>
      )}

      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
        <View className="flex-row items-baseline">
          <Text
            style={{
              fontFamily: 'DMSerifDisplay',
              fontSize: 19,
              color: '#fff',
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
          {other.age != null && (
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginLeft: 6 }}>
              {other.age}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── PromptCard ────────────────────────────────────────────────────────────────

type PromptCardProps = {
  question: string | null;
  answer: string;
  state: PromptState;
  recipientName: string;
  onOpen: () => void;
  onChangeText: (text: string) => void;
  onSend: () => void;
};

function PromptCard({
  question,
  answer,
  state,
  recipientName,
  onOpen,
  onChangeText,
  onSend,
}: PromptCardProps) {
  return (
    <View
      style={{
        backgroundColor: PAPER,
        borderWidth: 1,
        borderColor: LINE,
        borderRadius: 18,
        padding: 14,
      }}
    >
      {question != null && (
        <Text
          style={{
            fontSize: 10.5,
            color: INK_SUBTLE,
            textTransform: 'uppercase',
            letterSpacing: 1.4,
            marginBottom: 4,
            fontWeight: '700',
          }}
        >
          {question}
        </Text>
      )}
      <Text
        style={{
          fontFamily: 'DMSerifDisplay',
          fontSize: 19,
          color: INK,
          lineHeight: 24,
          letterSpacing: -0.3,
        }}
      >
        “{answer}”
      </Text>

      <View style={{ marginTop: 10 }}>
        {state.sent ? (
          <View className="flex-row items-center gap-1.5">
            <CheckIcon size={14} color={LEAF} />
            <Text style={{ color: LEAF, fontSize: 12.5, fontWeight: '600' }}>Reply sent</Text>
          </View>
        ) : state.open ? (
          <View className="gap-2">
            <TextInput
              style={{
                backgroundColor: CREAM,
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: INK,
                minHeight: 72,
                textAlignVertical: 'top',
              }}
              value={state.text}
              onChangeText={onChangeText}
              placeholder={`Write a comment for ${recipientName}…`}
              placeholderTextColor={INK_SUBTLE}
              multiline
              maxLength={300}
              editable={!state.sending}
            />
            {state.error != null && (
              <Text style={{ color: '#B91C1C', fontSize: 12 }}>{state.error}</Text>
            )}
            <Pressable
              onPress={onSend}
              disabled={!state.text.trim() || state.sending}
              className={cn('self-start', (!state.text.trim() || state.sending) && 'opacity-50')}
              style={{
                backgroundColor: LEAF,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 14,
              }}
            >
              {state.sending ? (
                <ActivityIndicator size="small" color={PAPER} />
              ) : (
                <Text style={{ color: PAPER, fontWeight: '600', fontSize: 13 }}>Send</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onOpen} hitSlop={6}>
            <Text style={{ color: LEAF, fontSize: 13, fontWeight: '600' }}>
              Reply to this prompt →
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── SheetBody (lazy wing note + prompts) ──────────────────────────────────────

function SheetBody({ match }: { match: MatchSummary }) {
  const { other } = match;
  const recipientName = other.chosenName ?? 'them';
  const { data } = useGetApiMatchesMatchIdSheetSuspense(match.matchId);
  const { wingNote, prompts } = data;
  const [promptStates, setPromptStates] = useState<Record<string, PromptState>>({});

  function setPromptField(promptId: string, patch: Partial<PromptState>) {
    setPromptStates((prev) => ({
      ...prev,
      [promptId]: {
        ...{ open: false, text: '', sending: false, sent: false, error: null },
        ...prev[promptId],
        ...patch,
      },
    }));
  }

  async function sendReply(promptId: string) {
    const state = promptStates[promptId];
    if (!state?.text.trim()) return;

    setPromptField(promptId, { sending: true, error: null });
    try {
      await postApiPromptResponses({
        profilePromptId: promptId,
        message: state.text.trim(),
      });
      setPromptField(promptId, { sending: false, sent: true });
    } catch {
      setPromptField(promptId, { sending: false, error: 'Failed to send. Try again.' });
    }
  }

  return (
    <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 16 }}>
      {wingNote != null && (
        <View
          style={{
            backgroundColor: LEAF_SOFT,
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <FaceAvatar name={wingNote.winger?.chosenName ?? 'Wing'} size={28} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 11,
                color: LEAF,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {wingNote.winger?.chosenName ?? 'Your wing'} says
            </Text>
            <Text style={{ fontSize: 13, color: INK, lineHeight: 18, marginTop: 2 }}>
              “{wingNote.note}”
            </Text>
          </View>
        </View>
      )}

      {prompts.map((prompt) => {
        const state = promptStates[prompt.id] ?? {
          open: false,
          text: '',
          sending: false,
          sent: false,
          error: null,
        };
        return (
          <PromptCard
            key={prompt.id}
            question={prompt.template?.question ?? null}
            answer={prompt.answer}
            state={state}
            recipientName={recipientName}
            onOpen={() => setPromptField(prompt.id, { open: true })}
            onChangeText={(t) => setPromptField(prompt.id, { text: t })}
            onSend={() => sendReply(prompt.id)}
          />
        );
      })}
    </View>
  );
}

// ── MatchSheet ────────────────────────────────────────────────────────────────

type MatchSheetProps = {
  match: MatchSummary | null;
  visible: boolean;
  onClose: () => void;
};

function MatchSheet({ match, visible, onClose }: MatchSheetProps) {
  if (!match) return null;

  const { other } = match;
  const interests: string[] = other.interests ?? [];
  const name = other.chosenName ?? 'Someone';
  const subtitleParts = [matchedAgo(match.createdAt), other.city].filter(Boolean);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: CREAM }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Handle bar */}
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: LINE,
              marginTop: 8,
              marginBottom: 12,
            }}
          />

          {/* Header row: name + age + subtitle, close button */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <View className="flex-row items-baseline">
                <Text
                  style={{
                    fontFamily: 'DMSerifDisplay',
                    fontSize: 32,
                    color: INK,
                    letterSpacing: -0.5,
                  }}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {other.age != null && (
                  <Text
                    style={{
                      fontSize: 22,
                      color: INK_MUTED,
                      marginLeft: 8,
                      fontWeight: '400',
                    }}
                  >
                    {other.age}
                  </Text>
                )}
              </View>
              {subtitleParts.length > 0 && (
                <Text style={{ fontSize: 13, color: INK_SUBTLE, marginTop: 2 }}>
                  {subtitleParts.join(' · ')}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: PAPER,
                borderWidth: 1,
                borderColor: LINE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XIcon size={16} color={INK} />
            </Pressable>
          </View>

          {/* Photo */}
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                borderRadius: 22,
                overflow: 'hidden',
                aspectRatio: 4 / 5,
                backgroundColor: PAPER,
              }}
            >
              {other.firstPhoto ? (
                <Image
                  source={{ uri: other.firstPhoto }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <GradientBlock name={name} radius={0} />
                </View>
              )}
            </View>
          </View>

          {/* Bio + interests */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
            {other.bio != null && other.bio.length > 0 && (
              <Text style={{ fontSize: 15, color: INK_MUTED, lineHeight: 22 }}>{other.bio}</Text>
            )}
            {interests.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5">
                {interests.map((interest, i) => (
                  <Pill key={`${interest}-${i}`} label={interest} tone="cream" />
                ))}
              </View>
            )}
          </View>

          {/* Wing note + prompts (lazy) */}
          {visible && (
            <ScreenSuspense
              fallback={
                <View style={{ paddingTop: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={LEAF} />
                </View>
              }
            >
              <SheetBody match={match} />
            </ScreenSuspense>
          )}
        </ScrollView>

        {/* Sticky CTA */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: LINE,
            backgroundColor: PAPER,
          }}
        >
          <Sprout
            block
            size="lg"
            onPress={() => {
              onClose();
              router.push(`/(tabs)/messages/${match.matchId}` as never);
            }}
          >
            {match.hasMessages ? 'Open conversation' : 'Start conversation'}
          </Sprout>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── MatchesList ───────────────────────────────────────────────────────────────

function MatchesList() {
  const { data: matches, refetch, isRefetching } = useGetApiMatchesSuspense();
  const [selectedMatch, setSelectedMatch] = useState<MatchSummary | null>(null);
  const newCount = matches.filter((m) => !m.hasMessages).length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -16, marginTop: -16, marginBottom: 4 }}>
            <LargeHeader
              title="Matches"
              right={
                newCount > 0 ? <Pill tone="leaf" size="sm" label={`${newCount} new`} /> : undefined
              }
            />
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Text style={{ fontSize: 13, color: INK_SUBTLE }}>
                People who said yes. Pick one to nudge.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-8">
            <Text
              style={{
                fontFamily: 'DMSerifDisplay',
                fontSize: 22,
                color: INK,
                letterSpacing: -0.4,
                textAlign: 'center',
              }}
            >
              No matches yet.
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: INK_MUTED,
                lineHeight: 21,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Keep swiping in Discover.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-1">
            <MatchCard match={item} onPress={() => setSelectedMatch(item)} />
          </View>
        )}
      />
      <MatchSheet
        match={selectedMatch}
        visible={selectedMatch != null}
        onClose={() => setSelectedMatch(null)}
      />
    </SafeAreaView>
  );
}

// ── MatchesScreen ─────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  return (
    <ScreenSuspense>
      <MatchesList />
    </ScreenSuspense>
  );
}
