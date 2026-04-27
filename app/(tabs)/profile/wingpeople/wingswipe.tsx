import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useWingSwipe } from '@/hooks/use-wing-swipe';
import { View, Text, Pressable, ScrollView, TextInput, SafeAreaView } from '@/lib/tw';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { Pill } from '@/components/ui/Pill';
import { Sprout } from '@/components/ui/Sprout';
import { useGetApiProfilesUserIdSuspense } from '@/lib/api/generated/profiles/profiles';
import type { WingProfile } from '@/lib/api/generated/model';
import { useGetApiWingPoolSuspense } from '@/lib/api/generated/wing-pool/wing-pool';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { cardButtonShadow } from '@/lib/styles';

const PAGE_SIZE = 20;

const INK = '#1F1B16';
const INK2 = '#4A4338';
const INK3 = '#8B8170';
const PAPER = '#FBF8F1';
const CREAM = '#F5F1E8';
const LINE = 'rgba(31,27,22,0.10)';
const LEAF = '#5A8C3A';

// ── Icons ────────────────────────────────────────────────────────────────────

function BackIcon({ color = INK }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function XIcon({ size = 24, color = INK2 }: { size?: number; color?: string }) {
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

function HeartIcon({ size = 24, color = PAPER }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color}>
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── WingCardEditorial ────────────────────────────────────────────────────────

function WingCardEditorial({
  card,
  daterFirstName,
}: {
  card: WingProfile;
  daterFirstName: string;
}) {
  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: CREAM,
        borderWidth: 1,
        borderColor: LINE,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
          },
          android: { elevation: 6 },
        }),
      }}
    >
      <View
        style={{
          paddingTop: 20,
          paddingHorizontal: 18,
          paddingBottom: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: INK3,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: '600',
          }}
        >
          {daterFirstName ? `For ${daterFirstName}` : 'Wing pick'}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: LEAF,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            fontWeight: '600',
          }}
        >
          Suggestion
        </Text>
      </View>

      <View style={{ paddingHorizontal: 18 }}>
        <Text
          className="font-serif"
          style={{
            fontSize: 44,
            lineHeight: 44,
            letterSpacing: -1,
            color: INK,
          }}
        >
          {card.chosenName},
        </Text>
        <Text
          className="font-serif"
          style={{
            fontSize: 44,
            lineHeight: 44,
            letterSpacing: -1,
            color: LEAF,
            fontStyle: 'italic',
          }}
        >
          {card.age}
        </Text>
        {card.city != null && (
          <Text style={{ fontSize: 13, color: INK2, marginTop: 6 }}>{card.city}</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              flex: 1,
              aspectRatio: 3 / 4,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#ebebf0',
            }}
          >
            {card.firstPhoto != null && (
              <Image
                source={{ uri: card.firstPhoto }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            )}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            {card.bio != null && (
              <Text style={{ fontSize: 12.5, color: INK2, lineHeight: 18 }}>{card.bio}</Text>
            )}
            {card.interests.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {card.interests.slice(0, 3).map((interest) => (
                  <Pill key={interest} label={interest} tone="outline" size="sm" />
                ))}
              </View>
            )}
          </View>
        </View>

        {card.interests.length > 3 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {card.interests.slice(3).map((interest) => (
              <Pill key={interest} label={interest} tone="cream" size="sm" />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── NoteModal ────────────────────────────────────────────────────────────────

function NoteModal({
  visible,
  daterFirstName,
  subjectName,
  onSend,
  onDismiss,
}: {
  visible: boolean;
  daterFirstName: string;
  subjectName: string;
  onSend: (note: string | null) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');

  function handleSend(withNote: boolean) {
    onSend(withNote && note.trim().length > 0 ? note.trim() : null);
    setNote('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View className="flex-1" style={{ backgroundColor: 'rgba(31,27,22,0.45)' }}>
        <Pressable className="flex-1" onPress={onDismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <View
            style={{
              backgroundColor: CREAM,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: LINE,
                marginBottom: 14,
              }}
            />
            <Text
              className="font-serif"
              style={{ fontSize: 24, color: INK, letterSpacing: -0.4, lineHeight: 28 }}
            >
              Add a note for {daterFirstName || 'them'}?
            </Text>
            <Text style={{ fontSize: 13, color: INK3, marginTop: 6, marginBottom: 14 }}>
              Why is {subjectName} a good pick? {daterFirstName || 'They'} will see this with the
              suggestion.
            </Text>
            <TextInput
              style={{
                width: '100%',
                minHeight: 90,
                borderWidth: 1,
                borderColor: LINE,
                borderRadius: 14,
                padding: 12,
                backgroundColor: PAPER,
                fontSize: 14,
                color: INK,
                textAlignVertical: 'top',
              }}
              placeholder={`e.g. they're obsessed with that pottery studio…`}
              placeholderTextColor={INK3}
              multiline
              value={note}
              onChangeText={setNote}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Sprout block variant="secondary" onPress={() => handleSend(false)}>
                  Skip & send
                </Sprout>
              </View>
              <View style={{ flex: 1 }}>
                <Sprout block onPress={() => handleSend(true)}>
                  Add note & send
                </Sprout>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ daterFirstName }: { daterFirstName: string }) {
  return (
    <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
      <Text
        className="font-serif"
        style={{ fontSize: 24, color: INK, letterSpacing: -0.3, textAlign: 'center' }}
      >
        {`That's everyone for now.`}
      </Text>
      <Text
        style={{ fontSize: 13, color: INK3, marginTop: 8, textAlign: 'center', lineHeight: 20 }}
      >
        {`You've gone through ${daterFirstName || 'their'}'s pool. Check back soon for new picks.`}
      </Text>
    </View>
  );
}

// ── WingSwipeContent ─────────────────────────────────────────────────────────

function WingSwipeContent() {
  const router = useRouter();
  const { daterId } = useLocalSearchParams<{ daterId: string }>();

  const { data: daterContext } = useGetApiProfilesUserIdSuspense(daterId);
  const { data: initialPool } = useGetApiWingPoolSuspense({
    daterId,
    pageSize: PAGE_SIZE,
    pageOffset: 0,
  });

  const { pool, index, suggest, decline } = useWingSwipe(daterId, initialPool);
  const card = pool[index] ?? null;

  const daterName = daterContext?.chosenName ?? '';
  const firstName = daterName.split(' ')[0] || daterName;
  const remaining = Math.max(pool.length - index, 0);

  const [noteVisible, setNoteVisible] = useState(false);

  async function handleSuggest(note: string | null) {
    setNoteVisible(false);
    await suggest(note);
  }

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: LINE,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ padding: 8, marginLeft: -4 }}
        >
          <BackIcon />
        </Pressable>
        <FaceAvatar name={daterName || '?'} size={32} photoUri={daterContext?.avatarUrl ?? null} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: INK }}>
            Swiping for {firstName || 'them'}
          </Text>
          <Text style={{ fontSize: 11.5, color: INK3, marginTop: 1 }}>
            Suggestions go to {firstName || 'them'} for review
          </Text>
        </View>
        {remaining > 0 && (
          <Pill tone="leaf" size="sm">
            {remaining} left
          </Pill>
        )}
      </View>

      <View style={{ flex: 1, padding: 14 }}>
        {card != null ? (
          <WingCardEditorial card={card} daterFirstName={firstName} />
        ) : (
          <EmptyState daterFirstName={firstName} />
        )}
      </View>

      {card != null && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
            paddingBottom: 28,
            paddingTop: 6,
          }}
        >
          <Pressable
            onPress={decline}
            style={[
              {
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: PAPER,
                borderWidth: 1,
                borderColor: LINE,
                alignItems: 'center',
                justifyContent: 'center',
              },
              cardButtonShadow,
            ]}
          >
            <XIcon size={24} color={INK2} />
          </Pressable>
          <Pressable
            onPress={() => setNoteVisible(true)}
            style={[
              {
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: LEAF,
                alignItems: 'center',
                justifyContent: 'center',
              },
              cardButtonShadow,
            ]}
          >
            <HeartIcon size={24} color={PAPER} />
          </Pressable>
        </View>
      )}

      <NoteModal
        visible={noteVisible}
        daterFirstName={firstName}
        subjectName={card?.chosenName ?? 'they'}
        onSend={handleSuggest}
        onDismiss={() => setNoteVisible(false)}
      />
    </>
  );
}

// ── WingSwipeScreen ──────────────────────────────────────────────────────────

export default function WingSwipeScreen() {
  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: CREAM }}>
      <ScreenSuspense>
        <WingSwipeContent />
      </ScreenSuspense>
    </SafeAreaView>
  );
}
