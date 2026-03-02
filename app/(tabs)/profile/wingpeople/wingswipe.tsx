import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useWingSwipe } from '@/hooks/use-wing-swipe';
import { View, Text, Pressable, ScrollView, TextInput, SafeAreaView } from '@/lib/tw';
import { NavHeader } from '@/components/ui/NavHeader';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { getDaterContext } from '@/queries/profiles';
import { getWingPool } from '@/queries/discover';
import { useSuspenseQuery } from '@/lib/useSuspenseQuery';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

const PAGE_SIZE = 20;

// ── DaterCallout ──────────────────────────────────────────────────────────────

function DaterCallout({ name, interests }: { name: string; interests: string[] }) {
  return (
    <View className="bg-purple-pale rounded-xl p-[14px] mb-4 gap-[10px]">
      <Text className="text-14 font-semibold text-purple">You think {name} would like this?</Text>
      {interests.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {interests.map((interest) => (
            <Pill key={interest} label={interest} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── WingCardView ──────────────────────────────────────────────────────────────

type WingCardViewProps = {
  card: {
    chosen_name: string;
    age: number;
    city: string;
    interests: string[];
    bio: string | null;
    first_photo: string | null;
  };
  callout: React.ReactNode;
};

function WingCardView({ card, callout }: WingCardViewProps) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <PhotoRect uri={card.first_photo} ratio={4 / 5} />
      <View className="p-4">
        <Text className="text-[28px] font-serif text-ink font-bold">
          {card.chosen_name}, {card.age}
        </Text>
        <Text className="text-15 text-ink-mid mt-1 mb-3">{card.city}</Text>
        {callout}
        {card.interests.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-4">
            {card.interests.map((interest) => (
              <Pill key={interest} label={interest} />
            ))}
          </View>
        )}
        {card.bio != null && (
          <Text className="text-15 text-ink-mid leading-[22px]">{card.bio}</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ── NoteModal ─────────────────────────────────────────────────────────────────

function NoteModal({
  visible,
  onSend,
  onDismiss,
}: {
  visible: boolean;
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
      <View className="flex-1 bg-[rgba(0,0,0,0.45)]">
        <Pressable className="flex-1" onPress={onDismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <View
            className="bg-white rounded-tl-[20px] rounded-tr-[20px] px-6 pt-3"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            <View className="self-center w-9 h-1 rounded-[2px] bg-ink-ghost mb-5" />
            <Text className="text-18 font-bold text-ink mb-1.5">Add a note?</Text>
            <Text className="text-14 text-ink-mid leading-5 mb-4">
              Let them know why you think they{"'"}d get along. (Optional)
            </Text>
            <TextInput
              className="border-[1.5px] border-divider rounded-xl px-4 py-[14px] text-15 text-ink bg-white min-h-[100px]"
              placeholder="She loves hiking and has a great laugh..."
              placeholderTextColor={colors.inkGhost}
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
            <View className="mt-4 gap-[10px]">
              <PurpleButton label="Skip & Send" onPress={() => handleSend(false)} outline />
              <PurpleButton label="Add Note & Send" onPress={() => handleSend(true)} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ daterName }: { daterName: string }) {
  return (
    <View className="flex-1 justify-center items-center p-6">
      <Text className="text-16 text-ink-mid text-center leading-6">
        You{"'"}ve gone through everyone in {daterName}
        {"'"}s area. Check back soon.
      </Text>
    </View>
  );
}

// ── WingSwipeContent ──────────────────────────────────────────────────────────

function WingSwipeContent() {
  const router = useRouter();
  const { session } = useAuth();
  const { daterId } = useLocalSearchParams<{ daterId: string }>();
  const wingerId = session!.user.id;

  // Load dater context via Suspense
  const daterContextFn = useCallback(async () => {
    const { data, error } = await getDaterContext(daterId);
    if (error) throw error;
    return data;
  }, [daterId]);
  const daterContext = useSuspenseQuery(daterContextFn);

  // Load initial pool via Suspense
  const initialPoolFn = useCallback(async () => {
    const { data, error } = await getWingPool(wingerId, daterId, PAGE_SIZE, 0);
    if (error) throw error;
    return data ?? [];
  }, [wingerId, daterId]);
  const initialPool = useSuspenseQuery(initialPoolFn);

  const { pool, index, suggest, decline } = useWingSwipe(wingerId, daterId, initialPool);
  const card = pool[index] ?? null;

  const daterName = daterContext?.chosen_name ?? '';
  const daterInterests =
    (daterContext?.dating_profiles as { interests: string[] } | null)?.interests ?? [];
  const firstName = daterName.split(' ')[0] || daterName;

  const [noteVisible, setNoteVisible] = useState(false);

  async function handleSuggest(note: string | null) {
    setNoteVisible(false);
    await suggest(note);
  }

  return (
    <>
      <NavHeader
        back
        title={daterName ? `Swiping for ${firstName}` : 'Wing Mode'}
        onBack={() => router.back()}
      />

      <View className="flex-1">
        {card != null ? (
          <WingCardView
            card={card}
            callout={<DaterCallout name={firstName || 'them'} interests={daterInterests} />}
          />
        ) : (
          <EmptyState daterName={firstName || 'them'} />
        )}
      </View>

      {card != null && (
        <View className="flex-row justify-center items-center gap-[40px] py-5 pb-7">
          <Pressable
            className="w-16 h-16 rounded-[32px] justify-center items-center bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 4,
            }}
            onPress={decline}
          >
            <Text className="text-[24px] text-ink-mid">✕</Text>
          </Pressable>
          <Pressable
            className="w-16 h-16 rounded-[32px] justify-center items-center bg-purple"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 4,
            }}
            onPress={() => setNoteVisible(true)}
          >
            <Text className="text-[24px] text-white">♥</Text>
          </Pressable>
        </View>
      )}

      <NoteModal
        visible={noteVisible}
        onSend={handleSuggest}
        onDismiss={() => setNoteVisible(false)}
      />
    </>
  );
}

// ── WingSwipeScreen ───────────────────────────────────────────────────────────

export default function WingSwipeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <ScreenSuspense>
        <WingSwipeContent />
      </ScreenSuspense>
    </SafeAreaView>
  );
}
