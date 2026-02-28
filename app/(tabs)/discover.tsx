import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/profile';
import { useDiscover } from '@/hooks/use-discover';
import { getActiveWingerTabs, type DiscoverCard } from '@/queries/discover';
import { updateDatingProfile } from '@/queries/profiles';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { TextTabBar } from '@/components/ui/TextTabBar';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { WingStack } from '@/components/ui/WingStack';
import { colors } from '@/constants/theme';

type WingerTab = { id: string; name: string };

// ── DiscoverPausedScreen ──────────────────────────────────────────────────────

function DiscoverPausedScreen({ status }: { status: 'break' | 'winging' }) {
  const { session } = useAuth();
  const { refreshProfile } = useProfile();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy =
    status === 'break'
      ? "You've paused Discover. Take all the time you need — your profile is hidden while you're on a break."
      : "You're in winging mode. You can't browse Discover while winging for someone else.";

  async function resume() {
    if (!session?.user.id) return;
    setUpdating(true);
    setError(null);
    const { error: err } = await updateDatingProfile(session.user.id, { dating_status: 'open' });
    if (err) {
      setError('Something went wrong. Please try again.');
      setUpdating(false);
      return;
    }
    await refreshProfile();
    setUpdating(false);
  }

  return (
    <SafeAreaView style={styles.canvas}>
      <LargeHeader title="Discover" />
      <View style={styles.centered}>
        <Text style={styles.pausedTitle}>
          {status === 'break' ? "You're on a break" : "You're winging"}
        </Text>
        <Text style={styles.pausedBody}>{copy}</Text>
        {error != null && <Text style={styles.errorText}>{error}</Text>}
        <PurpleButton label="Resume Discover" onPress={resume} loading={updating} />
      </View>
    </SafeAreaView>
  );
}

// ── WingNoteSection ───────────────────────────────────────────────────────────

function WingNoteSection({ card }: { card: DiscoverCard }) {
  const [expanded, setExpanded] = useState(false);
  const initial = card.suggester_name ? card.suggester_name[0].toUpperCase() : '?';

  return (
    <View style={styles.wingNote}>
      <View style={styles.wingNoteHeader}>
        <WingStack initials={[initial]} />
        <Text style={styles.wingNoteBy}>{card.suggester_name} thinks you{"'"}d get along</Text>
      </View>
      <Text style={styles.wingNoteText} numberOfLines={expanded ? undefined : 2}>
        {card.wing_note}
      </Text>
      {!expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)}>
          <Text style={styles.readMore}>Read more</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── CardView ──────────────────────────────────────────────────────────────────

function CardView({ card }: { card: DiscoverCard }) {
  return (
    <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
      <PhotoRect uri={card.first_photo} ratio={4 / 5} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>
          {card.chosen_name}, {card.age}
        </Text>
        <Text style={styles.cardCity}>{card.city}</Text>
        {card.wing_note != null && <WingNoteSection card={card} />}
        {card.interests.length > 0 && (
          <View style={styles.pills}>
            {card.interests.map((interest) => (
              <Pill key={interest} label={interest} />
            ))}
          </View>
        )}
        {card.bio != null && <Text style={styles.cardBio}>{card.bio}</Text>}
      </View>
    </ScrollView>
  );
}

// ── MatchOverlay ──────────────────────────────────────────────────────────────

function MatchOverlay({
  card,
  visible,
  onDismiss,
}: {
  card: DiscoverCard | null;
  visible: boolean;
  onDismiss: () => void;
}) {
  if (card == null) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.overlayPhotoWrap}>
          <PhotoRect uri={card.first_photo} ratio={4 / 5} blur style={styles.overlayPhoto} />
        </View>
        <View style={styles.overlayContent}>
          <Text style={styles.matchTitle}>It{"'"}s a Match!</Text>
          <Text style={styles.matchName}>{card.chosen_name}</Text>
          <View style={styles.overlayActions}>
            <PurpleButton label="Send a Message" onPress={onDismiss} />
            <PurpleButton label="Keep Swiping" onPress={onDismiss} outline />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ tab, wingerName }: { tab: string; wingerName?: string }) {
  const isWinger = tab !== 'For You' && tab !== 'All';
  const copy = isWinger
    ? `No picks from ${wingerName ?? tab} yet. Ask them to swipe for you.`
    : "You're all caught up. Check back soon for new profiles.";

  return (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>{copy}</Text>
    </View>
  );
}

// ── DiscoverScreen ────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { session } = useAuth();
  const { datingProfile, loadingProfile } = useProfile();

  const [wingerTabs, setWingerTabs] = useState<WingerTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [matchCard, setMatchCard] = useState<DiscoverCard | null>(null);

  const tabs = ['For You', ...wingerTabs.map((w) => w.name), 'All'];

  const filterWingerId =
    activeTabIndex === 0 || activeTabIndex === tabs.length - 1
      ? null
      : (wingerTabs[activeTabIndex - 1]?.id ?? null);

  const { pool, index, loading, like, pass } = useDiscover(filterWingerId);
  const card = pool[index] ?? null;

  // Load winger tabs on mount
  useEffect(() => {
    if (!session?.user.id) return;
    getActiveWingerTabs(session.user.id).then(({ data }) => {
      if (!data) return;
      const seen = new Set<string>();
      const distinct: WingerTab[] = [];
      for (const row of data) {
        const winger = row.winger as { id: string; chosen_name: string } | null;
        if (winger && !seen.has(winger.id)) {
          seen.add(winger.id);
          distinct.push({ id: winger.id, name: winger.chosen_name });
        }
      }
      setWingerTabs(distinct);
    });
  }, [session?.user.id]);

  // Profile loading
  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.canvas}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  // Gate: dater must be open
  if (datingProfile?.dating_status !== 'open') {
    const status = (datingProfile?.dating_status as 'break' | 'winging') ?? 'break';
    return <DiscoverPausedScreen status={status} />;
  }

  async function handleLike() {
    const likedCard = pool[index];
    const result = await like();
    if (result === 'match') {
      setMatchCard(likedCard);
    }
  }

  async function handlePass() {
    await pass();
  }

  return (
    <SafeAreaView style={styles.canvas}>
      <LargeHeader title="Discover" />
      <TextTabBar tabs={tabs} active={activeTabIndex} setActive={setActiveTabIndex} />

      <View style={styles.feedContainer}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : card != null ? (
          <CardView card={card} />
        ) : (
          <EmptyState
            tab={tabs[activeTabIndex]}
            wingerName={wingerTabs[activeTabIndex - 1]?.name}
          />
        )}
      </View>

      {card != null && !loading && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.passBtn]}
            onPress={handlePass}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.passBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={handleLike}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.likeBtnText}>♥</Text>
          </TouchableOpacity>
        </View>
      )}

      <MatchOverlay
        card={matchCard}
        visible={matchCard != null}
        onDismiss={() => setMatchCard(null)}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },

  // Paused screen
  pausedTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: colors.ink,
    textAlign: 'center',
  },
  pausedBody: {
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },

  // Wing note
  wingNote: {
    backgroundColor: colors.lavender,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  wingNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wingNoteBy: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  wingNoteText: {
    fontSize: 14,
    color: colors.inkMid,
    lineHeight: 20,
  },
  readMore: {
    fontSize: 13,
    color: colors.purple,
    fontWeight: '500',
    marginTop: 2,
  },

  // Card
  cardScroll: {
    flex: 1,
  },
  cardBody: {
    padding: 16,
  },
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

  // Match overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPhotoWrap: {
    width: '80%',
    marginBottom: 32,
  },
  overlayPhoto: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  overlayContent: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  matchTitle: {
    fontSize: 32,
    fontFamily: 'Georgia',
    fontWeight: '700',
    color: colors.white,
  },
  matchName: {
    fontSize: 20,
    color: colors.white,
    opacity: 0.85,
    marginBottom: 8,
  },
  overlayActions: {
    width: '100%',
    gap: 12,
  },

  // Feed
  feedContainer: {
    flex: 1,
  },

  // Empty state
  emptyText: {
    fontSize: 16,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 24,
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
  passBtn: {
    backgroundColor: colors.white,
  },
  likeBtn: {
    backgroundColor: colors.purple,
  },
  passBtnText: {
    fontSize: 24,
    color: colors.inkMid,
  },
  likeBtnText: {
    fontSize: 24,
    color: colors.white,
  },
});
