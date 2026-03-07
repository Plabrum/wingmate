import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth';
import { View, Text, Pressable, ScrollView, TextInput, SafeAreaView } from '@/lib/tw';
import { cn } from '@/lib/cn';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import {
  useMatchesData,
  useMatchSheetData,
  getOtherProfile,
  getFirstPhoto,
  hasMessages,
  type MatchRow,
} from '@/queries/matches';
import { addPromptResponse } from '@/queries/prompts';
import { getInitials } from '@/components/profile/profile-helpers';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { WingStack } from '@/components/ui/WingStack';
import { colors } from '@/constants/theme';

// ── Age helper ────────────────────────────────────────────────────────────────

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

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
  match: MatchRow;
  currentUserId: string;
  onPress: () => void;
};

function MatchCard({ match, currentUserId, onPress }: MatchCardProps) {
  const other = getOtherProfile(match, currentUserId);
  const photoUrl = getFirstPhoto(other);
  const isNew = !hasMessages(match);

  const dob = (other as { date_of_birth?: string | null }).date_of_birth;
  const age = dob ? computeAge(dob) : null;

  return (
    <Pressable className="rounded-xl overflow-hidden bg-surface" onPress={onPress}>
      <PhotoRect uri={photoUrl} ratio={4 / 3} style={{ width: '100%' }} />
      {/* Name + age overlay */}
      <View
        className="absolute bottom-0 left-0 right-0 px-2 py-[6px]"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
          {other.chosen_name ?? 'Someone'}
          {age != null ? `, ${age}` : ''}
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

function SheetBody({ match, currentUserId }: { match: MatchRow; currentUserId: string }) {
  const other = getOtherProfile(match, currentUserId);
  const {
    data: { wingNote, prompts },
  } = useMatchSheetData(currentUserId, other.id);
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
    const { error } = await addPromptResponse(currentUserId, promptId, state.text.trim());
    if (error) {
      setPromptField(promptId, { sending: false, error: 'Failed to send. Try again.' });
    } else {
      setPromptField(promptId, { sending: false, sent: true });
    }
  }

  return (
    <>
      {/* Wing note */}
      {wingNote?.note != null && (
        <View className="mx-5 mt-4 bg-accent-muted rounded-xl p-[14px]">
          <View className="flex-row items-center gap-2 mb-[6px]">
            <WingStack initials={[getInitials(wingNote.winger?.chosen_name)]} />
            <Text className="text-sm font-semibold text-accent">
              {wingNote.winger?.chosen_name ?? 'Your wing'} introduced you
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
                    Comment sent — {other.chosen_name ?? 'They'} will see it.
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
  match: MatchRow | null;
  currentUserId: string;
  visible: boolean;
  onClose: () => void;
};

function MatchSheet({ match, currentUserId, visible, onClose }: MatchSheetProps) {
  if (!match) return null;

  const other = getOtherProfile(match, currentUserId);
  const photoUrl = getFirstPhoto(other);
  const dob = (other as { date_of_birth?: string | null }).date_of_birth;
  const age = dob ? computeAge(dob) : null;
  const dp = Array.isArray(other.dating_profiles)
    ? other.dating_profiles[0]
    : other.dating_profiles;
  const city = dp?.city ?? null;
  const bio = dp?.bio ?? null;
  const interests: string[] = Array.isArray(dp?.interests) ? (dp.interests as string[]) : [];
  const matchHasMessages = hasMessages(match);

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
          <PhotoRect uri={photoUrl} ratio={4 / 3} style={{ width: '100%', borderRadius: 0 }} />

          {/* Name + Age + City */}
          <View className="px-5 pt-4 pb-2">
            <Text className="text-2xl font-bold text-fg font-serif">
              {other.chosen_name ?? 'Someone'}
              {age != null ? `, ${age}` : ''}
            </Text>
            {city != null && <Text className="text-sm text-fg-muted mt-0.5">{city}</Text>}
          </View>

          {/* Bio */}
          {bio != null && bio.length > 0 && (
            <View className="px-5 pt-4">
              <Text className="text-xs font-bold tracking-[0.8px] text-fg-subtle uppercase mb-2">
                About
              </Text>
              <Text className="text-sm leading-[22px] text-fg">{bio}</Text>
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
              <SheetBody match={match} currentUserId={currentUserId} />
            </ScreenSuspense>
          )}

          {/* CTA */}
          <View className="mx-5 mt-6">
            <PurpleButton
              label={matchHasMessages ? 'Open Conversation' : 'Start Conversation'}
              onPress={() => {
                onClose();
                router.push(`/(tabs)/messages/${match.id}` as never);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── MatchesList ───────────────────────────────────────────────────────────────

function MatchesList({ userId }: { userId: string }) {
  const { data: matches, refetch, isRefetching } = useMatchesData(userId);
  const [selectedMatch, setSelectedMatch] = useState<MatchRow | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
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
            <MatchCard match={item} currentUserId={userId} onPress={() => setSelectedMatch(item)} />
          </View>
        )}
      />
      <MatchSheet
        match={selectedMatch}
        currentUserId={userId}
        visible={selectedMatch != null}
        onClose={() => setSelectedMatch(null)}
      />
    </SafeAreaView>
  );
}

// ── MatchesScreen ─────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { userId } = useAuth();
  return (
    <ScreenSuspense>
      <MatchesList userId={userId} />
    </ScreenSuspense>
  );
}
