import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/auth';
import { useMatches } from '@/hooks/use-matches';
import {
  getOtherProfile,
  getFirstPhoto,
  hasMessages,
  getWingNoteForMatch,
  getMatchPrompts,
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

type Prompt = {
  id: string;
  answer: string;
  template: { question: string } | null;
};

type WingNote = {
  note: string | null;
  suggested_by: string | null;
  winger: { chosen_name: string | null } | null;
};

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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <PhotoRect uri={photoUrl} ratio={4 / 3} style={styles.cardPhoto} />
      {/* Name + age overlay */}
      <View style={styles.cardOverlay}>
        <Text style={styles.cardName} numberOfLines={1}>
          {other.chosen_name ?? 'Someone'}
          {age != null ? `, ${age}` : ''}
        </Text>
      </View>
      {/* New match indicator */}
      {isNew && <View style={styles.newDot} />}
    </TouchableOpacity>
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
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [wingNote, setWingNote] = useState<WingNote | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptStates, setPromptStates] = useState<Record<string, PromptState>>({});

  const loadSheetData = useCallback(async () => {
    if (!match) return;
    const other = getOtherProfile(match, currentUserId);

    setSheetLoading(true);
    setSheetError(null);
    setWingNote(null);
    setPrompts([]);
    setPromptStates({});

    try {
      const [noteResult, promptResult] = await Promise.all([
        getWingNoteForMatch(currentUserId, other.id),
        getMatchPrompts(other.id),
      ]);

      if (noteResult.error) throw noteResult.error;
      if (promptResult.error) throw promptResult.error;

      setWingNote(noteResult.data as WingNote | null);

      const dp = promptResult.data;
      const raw = dp?.profile_prompts ?? [];
      const list = (Array.isArray(raw) ? raw : [raw]) as Prompt[];
      setPrompts(list);
    } catch {
      setSheetError("Couldn't load profile. Try again.");
    } finally {
      setSheetLoading(false);
    }
  }, [match, currentUserId]);

  // Load when sheet becomes visible
  React.useEffect(() => {
    if (visible && match) {
      loadSheetData();
    }
  }, [visible, match, loadSheetData]);

  if (!match) return null;

  const other = getOtherProfile(match, currentUserId);
  const photoUrl = getFirstPhoto(other);
  const dob = (other as { date_of_birth?: string | null }).date_of_birth;
  const age = dob ? computeAge(dob) : null;
  const dp = Array.isArray(other.dating_profiles) ? other.dating_profiles[0] : other.dating_profiles;
  const city = dp?.city ?? null;
  const bio = dp?.bio ?? null;
  const interests: string[] = Array.isArray(dp?.interests) ? (dp.interests as string[]) : [];
  const matchHasMessages = hasMessages(match);

  function setPromptField(promptId: string, patch: Partial<PromptState>) {
    setPromptStates((prev) => ({
      ...prev,
      [promptId]: { ...{ open: false, text: '', sending: false, sent: false, error: null }, ...prev[promptId], ...patch },
    }));
  }

  async function sendReply(promptId: string) {
    const state = promptStates[promptId];
    if (!state?.text.trim()) return;

    setPromptField(promptId, { sending: true, error: null });
    try {
      const { error } = await addPromptResponse(currentUserId, promptId, state.text.trim());
      if (error) throw error;
      setPromptField(promptId, { sending: false, sent: true });
    } catch {
      setPromptField(promptId, { sending: false, error: 'Failed to send. Try again.' });
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Photo */}
          <PhotoRect uri={photoUrl} ratio={4 / 3} style={styles.sheetPhoto} />

          {/* Name + Age + City */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetName}>
              {other.chosen_name ?? 'Someone'}
              {age != null ? `, ${age}` : ''}
            </Text>
            {city != null && <Text style={styles.sheetCity}>{city}</Text>}
          </View>

          {/* Bio */}
          {bio != null && bio.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.bioText}>{bio}</Text>
            </View>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Interests</Text>
              <View style={styles.pillRow}>
                {interests.map((interest, i) => (
                  <Pill key={i} label={interest} />
                ))}
              </View>
            </View>
          )}

          {/* Lazy-load states */}
          {sheetLoading && (
            <ActivityIndicator color={colors.purple} style={styles.sheetSpinner} />
          )}

          {sheetError != null && (
            <View style={styles.sheetErrorWrap}>
              <Text style={styles.sheetErrorText}>{sheetError}</Text>
              <TouchableOpacity onPress={loadSheetData}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!sheetLoading && sheetError == null && (
            <>
              {/* Wing note */}
              {wingNote?.note != null && (
                <View style={styles.wingNoteBox}>
                  <View style={styles.wingNoteHeader}>
                    <WingStack
                      initials={[getInitials(wingNote.winger?.chosen_name)]}
                    />
                    <Text style={styles.wingNoteBy}>
                      {wingNote.winger?.chosen_name ?? 'Your wing'} introduced you
                    </Text>
                  </View>
                  <Text style={styles.wingNoteText}>{wingNote.note}</Text>
                </View>
              )}

              {/* Prompts */}
              {prompts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Prompts</Text>
                  {prompts.map((prompt) => {
                    const ps = promptStates[prompt.id] ?? {
                      open: false,
                      text: '',
                      sending: false,
                      sent: false,
                      error: null,
                    };
                    return (
                      <View key={prompt.id} style={styles.promptCard}>
                        {prompt.template?.question != null && (
                          <Text style={styles.promptQuestion}>{prompt.template.question}</Text>
                        )}
                        <Text style={styles.promptAnswer}>{prompt.answer}</Text>

                        {ps.sent ? (
                          <Text style={styles.sentConfirm}>
                            Comment sent — {other.chosen_name ?? 'They'} will see it.
                          </Text>
                        ) : ps.open ? (
                          <View style={styles.replyBox}>
                            <TextInput
                              style={styles.replyInput}
                              value={ps.text}
                              onChangeText={(t) => setPromptField(prompt.id, { text: t })}
                              placeholder="Write a comment…"
                              placeholderTextColor={colors.inkGhost}
                              multiline
                              maxLength={300}
                              editable={!ps.sending}
                            />
                            {ps.error != null && (
                              <Text style={styles.replyError}>{ps.error}</Text>
                            )}
                            <TouchableOpacity
                              style={[styles.sendBtn, (!ps.text.trim() || ps.sending) && styles.sendBtnDimmed]}
                              onPress={() => sendReply(prompt.id)}
                              disabled={!ps.text.trim() || ps.sending}
                            >
                              {ps.sending ? (
                                <ActivityIndicator color={colors.white} size="small" />
                              ) : (
                                <Text style={styles.sendBtnText}>Send</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.replyToggle}
                            onPress={() => setPromptField(prompt.id, { open: true })}
                          >
                            <Text style={styles.replyToggleText}>Reply to this prompt</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* CTA */}
          <View style={styles.ctaWrap}>
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

// ── MatchesScreen ─────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { matches, loading, refresh } = useMatches();
  const [selectedMatch, setSelectedMatch] = useState<MatchRow | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.canvas}>
        <LargeHeader title="Matches" />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.canvas}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        onRefresh={refresh}
        refreshing={loading}
        ListHeaderComponent={<LargeHeader title="Matches" />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No matches yet. Keep swiping in Discover.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cellWrapper}>
            <MatchCard
              match={item}
              currentUserId={userId}
              onPress={() => setSelectedMatch(item)}
            />
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Grid
  listContent: {
    padding: 16,
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  cellWrapper: {
    flex: 1,
  },

  // MatchCard
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  cardPhoto: {
    width: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cardName: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  newDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.purple,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  // MatchSheet
  sheetRoot: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  handleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    marginTop: 12,
    marginBottom: 8,
  },
  sheetPhoto: {
    width: '100%',
    borderRadius: 0,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'Georgia',
  },
  sheetCity: {
    fontSize: 14,
    color: colors.inkMid,
    marginTop: 2,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.inkDim,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Wing note
  wingNoteBox: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.purplePale,
    borderRadius: 12,
    padding: 14,
  },
  wingNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  wingNoteBy: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.purple,
  },
  wingNoteText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },

  // Sheet loading/error
  sheetSpinner: {
    marginTop: 32,
  },
  sheetErrorWrap: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 8,
  },
  sheetErrorText: {
    fontSize: 14,
    color: colors.inkMid,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple,
  },

  // Prompts
  promptCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  promptQuestion: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkDim,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  promptAnswer: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 21,
  },
  replyToggle: {
    marginTop: 10,
  },
  replyToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.purple,
  },
  replyBox: {
    marginTop: 10,
    gap: 8,
  },
  replyInput: {
    backgroundColor: colors.muted,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  replyError: {
    fontSize: 12,
    color: '#B91C1C',
  },
  sendBtn: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDimmed: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  sentConfirm: {
    marginTop: 10,
    fontSize: 13,
    color: colors.green,
    fontWeight: '500',
  },

  // CTA
  ctaWrap: {
    marginHorizontal: 20,
    marginTop: 24,
  },
});
