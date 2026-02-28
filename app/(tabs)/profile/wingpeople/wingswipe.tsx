import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useWingSwipe } from '@/hooks/use-wing-swipe';
import { NavHeader } from '@/components/ui/NavHeader';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';

// ── DaterCallout ──────────────────────────────────────────────────────────────

function DaterCallout({ name, interests }: { name: string; interests: string[] }) {
  return (
    <View style={st.callout}>
      <Text style={st.calloutTitle}>You think {name} would like this?</Text>
      {interests.length > 0 && (
        <View style={st.calloutPills}>
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
    <ScrollView style={st.cardScroll} showsVerticalScrollIndicator={false}>
      <PhotoRect uri={card.first_photo} ratio={4 / 5} />
      <View style={st.cardBody}>
        <Text style={st.cardName}>
          {card.chosen_name}, {card.age}
        </Text>
        <Text style={st.cardCity}>{card.city}</Text>
        {callout}
        {card.interests.length > 0 && (
          <View style={st.pills}>
            {card.interests.map((interest) => (
              <Pill key={interest} label={interest} />
            ))}
          </View>
        )}
        {card.bio != null && <Text style={st.cardBio}>{card.bio}</Text>}
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
      <View style={st.modalOverlay}>
        <TouchableOpacity style={st.modalDismiss} activeOpacity={1} onPress={onDismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={st.modalOuter}
        >
          <View style={[st.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={st.handle} />
            <Text style={st.modalTitle}>Add a note?</Text>
            <Text style={st.modalSub}>
              Let them know why you think they{"'"}d get along. (Optional)
            </Text>
            <TextInput
              style={st.noteInput}
              placeholder="She loves hiking and has a great laugh..."
              placeholderTextColor={colors.inkGhost}
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
            <View style={st.modalActions}>
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
    <View style={st.centered}>
      <Text style={st.emptyText}>
        You{"'"}ve gone through everyone in {daterName}{"'"}s area. Check back soon.
      </Text>
    </View>
  );
}

// ── WingSwipeScreen ───────────────────────────────────────────────────────────

export default function WingSwipeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { daterId } = useLocalSearchParams<{ daterId: string }>();

  const wingerId = session!.user.id;

  const [daterName, setDaterName] = useState('');
  const [daterInterests, setDaterInterests] = useState<string[]>([]);
  const [noteVisible, setNoteVisible] = useState(false);

  const { pool, index, loading, suggest, decline } = useWingSwipe(wingerId, daterId);
  const card = pool[index] ?? null;

  // Load dater context on mount
  useEffect(() => {
    supabase
      .from('profiles')
      .select('chosen_name, dating_profiles(interests)')
      .eq('id', daterId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setDaterName(data.chosen_name ?? '');
        const dp = data.dating_profiles as { interests: string[] } | null;
        setDaterInterests(dp?.interests ?? []);
      });
  }, [daterId]);

  const firstName = daterName.split(' ')[0] || daterName;

  async function handleSuggest(note: string | null) {
    setNoteVisible(false);
    await suggest(note);
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <NavHeader
        back
        title={daterName ? `Swiping for ${firstName}` : 'Wing Mode'}
        onBack={() => router.back()}
      />

      <View style={st.feedContainer}>
        {loading ? (
          <View style={st.centered}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : card != null ? (
          <WingCardView
            card={card}
            callout={
              <DaterCallout name={firstName || 'them'} interests={daterInterests} />
            }
          />
        ) : (
          <EmptyState daterName={firstName || 'them'} />
        )}
      </View>

      {card != null && !loading && (
        <View style={st.actionRow}>
          <TouchableOpacity
            style={[st.actionBtn, st.passBtn]}
            onPress={decline}
            activeOpacity={0.8}
          >
            <Text style={st.passBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.actionBtn, st.likeBtn]}
            onPress={() => setNoteVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={st.likeBtnText}>♥</Text>
          </TouchableOpacity>
        </View>
      )}

      <NoteModal
        visible={noteVisible}
        onSend={handleSuggest}
        onDismiss={() => setNoteVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  feedContainer: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Card
  cardScroll: { flex: 1 },
  cardBody: { padding: 16 },
  cardName: {
    fontSize: 28,
    fontFamily: 'Georgia',
    color: colors.ink,
    fontWeight: '700',
  },
  cardCity: {
    fontSize: 15,
    color: colors.inkMid,
    marginTop: 4,
    marginBottom: 12,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cardBio: {
    fontSize: 15,
    color: colors.inkMid,
    lineHeight: 22,
  },

  // Dater callout
  callout: {
    backgroundColor: colors.purplePale,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple,
  },
  calloutPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 20,
    paddingBottom: 28,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  passBtn: { backgroundColor: colors.white },
  likeBtn: { backgroundColor: colors.purple },
  passBtnText: { fontSize: 24, color: colors.inkMid },
  likeBtnText: { fontSize: 24, color: colors.white },

  // Note modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalDismiss: { flex: 1 },
  modalOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkGhost,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 14,
    color: colors.inkMid,
    lineHeight: 20,
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  modalActions: {
    marginTop: 16,
    gap: 10,
  },

  // Empty state
  emptyText: {
    fontSize: 16,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 24,
  },
});
