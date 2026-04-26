import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { router } from 'expo-router';

import { View, Text, Pressable, ScrollView, TextInput, SafeAreaView } from '@/lib/tw';
import { cn } from '@/lib/cn';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import {
  useGetApiMatchesMatchIdSheetSuspense,
  useGetApiMatchesSuspense,
} from '@/lib/api/generated/matches/matches';
import type { MatchSummary } from '@/lib/api/generated/model';
import { postApiPromptResponses } from '@/lib/api/generated/prompts/prompts';
import { getInitials } from '@/components/profile/profile-helpers';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { WingStack } from '@/components/ui/WingStack';
import { colors } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type PromptState = {
  open: boolean;
  text: string;
  sending: boolean;
  sent: boolean;
  error: string | null;
};

// ── MatchCard (grid cell) ─────────────────────────────────────────────────────

type MatchCardProps = {
  match: MatchSummary;
  onPress: () => void;
};

function MatchCard({ match, onPress }: MatchCardProps) {
  const { other, hasMessages } = match;
  const isNew = !hasMessages;

  return (
    <Pressable className="rounded-xl overflow-hidden bg-surface" onPress={onPress}>
      <PhotoRect uri={other.firstPhoto} ratio={4 / 3} style={{ width: '100%' }} />
      {/* Name + age overlay */}
      <View
        className="absolute bottom-0 left-0 right-0 px-2 py-[6px]"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
          {other.chosenName ?? 'Someone'}
          {other.age != null ? `, ${other.age}` : ''}
        </Text>
      </View>
      {/* New match indicator */}
      {isNew && (
        <View className="absolute top-2 right-2 w-[10px] h-[10px] rounded-full bg-accent border-[1.5px] border-white" />
      )}
    </Pressable>
  );
}

// ── SheetBody (lazy wing note + prompts) ──────────────────────────────────────

function SheetBody({ match }: { match: MatchSummary }) {
  const { other } = match;
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
    <>
      {/* Wing note */}
      {wingNote != null && (
        <View className="mx-5 mt-4 bg-accent-muted rounded-xl p-[14px]">
          <View className="flex-row items-center gap-2 mb-[6px]">
            <WingStack items={[{ initials: getInitials(wingNote.winger?.chosenName) }]} />
            <Text className="text-sm font-semibold text-accent">
              {wingNote.winger?.chosenName ?? 'Your wing'} introduced you
            </Text>
          </View>
          <Text className="text-sm leading-[20px] text-fg">{wingNote.note}</Text>
        </View>
      )}

      {/* Prompts */}
      {prompts.length > 0 && (
        <View className="px-5 pt-4">
          <Text className="text-xs font-bold tracking-[0.8px] text-fg-subtle uppercase mb-2">
            Prompts
          </Text>
          {prompts.map((prompt) => {
            const ps = promptStates[prompt.id] ?? {
              open: false,
              text: '',
              sending: false,
              sent: false,
              error: null,
            };
            return (
              <View key={prompt.id} className="bg-white rounded-xl p-[14px] mb-[10px]">
                {prompt.template?.question != null && (
                  <Text className="text-xs font-semibold text-fg-subtle tracking-[0.5px] mb-1">
                    {prompt.template.question}
                  </Text>
                )}
                <Text className="text-sm leading-[21px] text-fg">{prompt.answer}</Text>

                {ps.sent ? (
                  <Text className="mt-[10px] text-sm text-green-500 font-medium">
                    Comment sent — {other.chosenName ?? 'They'} will see it.
                  </Text>
                ) : ps.open ? (
                  <View className="mt-[10px] gap-2">
                    <TextInput
                      className="bg-surface rounded-lg p-3 text-sm text-fg min-h-[72px]"
                      style={{ textAlignVertical: 'top' }}
                      value={ps.text}
                      onChangeText={(t) => setPromptField(prompt.id, { text: t })}
                      placeholder="Write a comment…"
                      placeholderTextColor={colors.inkGhost}
                      multiline
                      maxLength={300}
                      editable={!ps.sending}
                    />
                    {ps.error != null && <Text className="text-xs text-[#B91C1C]">{ps.error}</Text>}
                    <Pressable
                      className={cn(
                        'bg-accent rounded-lg py-[10px] items-center justify-center',
                        (!ps.text.trim() || ps.sending) && 'opacity-50'
                      )}
                      onPress={() => sendReply(prompt.id)}
                      disabled={!ps.text.trim() || ps.sending}
                    >
                      {ps.sending ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text className="text-white font-semibold text-sm">Send</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    className="mt-[10px]"
                    onPress={() => setPromptField(prompt.id, { open: true })}
                  >
                    <Text className="text-sm font-semibold text-accent">Reply to this prompt</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
    </>
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
  const matchHasMessages = match.hasMessages;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.canvas }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Close button */}
        <Pressable
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          onPress={onClose}
          hitSlop={12}
        >
          <Text className="text-white text-sm font-bold">✕</Text>
        </Pressable>

        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {/* Handle bar */}
          <View className="self-center w-9 h-1 rounded-[2px] bg-separator mt-3 mb-2" />

          {/* Photo */}
          <PhotoRect
            uri={other.firstPhoto}
            ratio={4 / 3}
            style={{ width: '100%', borderRadius: 0 }}
          />

          {/* Name + Age + City */}
          <View className="px-5 pt-4 pb-2">
            <Text className="text-2xl font-bold text-fg font-serif">
              {other.chosenName ?? 'Someone'}
              {other.age != null ? `, ${other.age}` : ''}
            </Text>
            {other.city != null && (
              <Text className="text-sm text-fg-muted mt-0.5">{other.city}</Text>
            )}
          </View>

          {/* Bio */}
          {other.bio != null && other.bio.length > 0 && (
            <View className="px-5 pt-4">
              <Text className="text-xs font-bold tracking-[0.8px] text-fg-subtle uppercase mb-2">
                About
              </Text>
              <Text className="text-sm leading-[22px] text-fg">{other.bio}</Text>
            </View>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <View className="px-5 pt-4">
              <Text className="text-xs font-bold tracking-[0.8px] text-fg-subtle uppercase mb-2">
                Interests
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {interests.map((interest, i) => (
                  <Pill key={i} label={interest} />
                ))}
              </View>
            </View>
          )}

          {/* Wing note + prompts (lazy) */}
          {visible && (
            <ScreenSuspense
              fallback={<ActivityIndicator color={colors.purple} style={{ marginTop: 32 }} />}
            >
              <SheetBody match={match} />
            </ScreenSuspense>
          )}

          {/* CTA */}
          <View className="mx-5 mt-6">
            <PurpleButton
              label={matchHasMessages ? 'Open Conversation' : 'Start Conversation'}
              onPress={() => {
                onClose();
                router.push(`/(tabs)/messages/${match.matchId}` as never);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── MatchesList ───────────────────────────────────────────────────────────────

function MatchesList() {
  const { data: matches, refetch, isRefetching } = useGetApiMatchesSuspense();
  const [selectedMatch, setSelectedMatch] = useState<MatchSummary | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={<LargeHeader title="Matches" />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-sm leading-[22px] text-fg-muted text-center">
              No matches yet. Keep swiping in Discover.
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
