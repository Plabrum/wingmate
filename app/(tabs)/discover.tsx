import React, { Suspense, useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { View, Text, ScrollView, SafeAreaView, Pressable, Modal, ModalView } from '@/lib/tw';
import { useAuth } from '@/context/auth';
import { useDiscover, type PoolFetcher, type LikeResult } from '@/hooks/use-discover';
import type { Enums } from '@/types/database';
import {
  getDiscoverPool,
  getLikesYouPool,
  useLikesYouCount,
  useWingerTabs,
  useInitialPool,
  type DiscoverCard,
  type WingerTab,
} from '@/queries/discover';
import { updateDatingProfile, useProfileData } from '@/queries/profiles';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { TextTabBar } from '@/components/ui/TextTabBar';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { WingStack } from '@/components/ui/WingStack';
import { colors } from '@/constants/theme';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { cardButtonShadow } from '@/lib/styles';

const PAGE_SIZE = 20;

// ── DiscoverPausedScreen ──────────────────────────────────────────────────────

function DiscoverPausedScreen({
  status,
  onResume,
}: {
  status: Exclude<Enums<'dating_status'>, 'open'>;
  onResume: () => void;
}) {
  const { userId } = useAuth();
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm();

  if (status === 'winging') {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <LargeHeader title="Discover" />
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-2xl font-bold font-serif text-fg text-center">
            Nothing to see here...
          </Text>
          <Text className="text-sm text-fg-muted text-center mt-2" style={{ lineHeight: 22 }}>
            you{"'"}re just winging!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function resume() {
    const { error: err } = await updateDatingProfile(userId, { dating_status: 'open' });
    if (err) {
      toast.error('Something went wrong. Please try again.');
      return;
    }
    onResume();
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <LargeHeader title="Discover" />
      <View className="flex-1 justify-center items-center p-6 gap-4">
        <Text className="text-2xl font-bold font-serif text-fg text-center">
          You{"'"}re on a break
        </Text>
        <Text className="text-sm text-fg-muted text-center" style={{ lineHeight: 22 }}>
          Your profile is hidden while you{"'"}re on a break. Take all the time you need.
        </Text>
        <PurpleButton
          label="Resume Discover"
          onPress={handleSubmit(resume)}
          loading={isSubmitting}
        />
      </View>
    </SafeAreaView>
  );
}

// ── WingNoteSection ───────────────────────────────────────────────────────────

function WingNoteSection({ card }: { card: DiscoverCard }) {
  const [expanded, setExpanded] = useState(false);
  const initial = card.suggester_name ? card.suggester_name[0].toUpperCase() : '?';

  return (
    <View className="bg-accent-muted rounded-xl p-3 mb-4 gap-[6px]">
      <View className="flex-row items-center gap-2">
        <WingStack items={[{ initials: initial }]} />
        <Text className="text-sm font-semibold text-fg flex-1">
          {card.suggester_name} thinks you{"'"}d get along
        </Text>
      </View>
      <Text
        className="text-sm text-fg-muted"
        style={{ lineHeight: 20 }}
        numberOfLines={expanded ? undefined : 2}
      >
        {card.wing_note}
      </Text>
      {!expanded && (
        <Pressable onPress={() => setExpanded(true)}>
          <Text className="text-sm text-accent font-medium mt-[2px]">Read more</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── CardView ──────────────────────────────────────────────────────────────────

function CardView({ card }: { card: DiscoverCard }) {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4">
        <PhotoRect uri={card.first_photo} ratio={1} />
      </View>
      <View className="p-4">
        <Text className="text-3xl font-serif font-bold text-fg">
          {card.chosen_name}, {card.age}
        </Text>
        <Text className="text-sm text-fg-muted mt-1 mb-3">{card.city}</Text>
        {card.wing_note != null && <WingNoteSection card={card} />}
        {card.interests.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-4">
            {card.interests.map((interest) => (
              <Pill key={interest} label={interest} />
            ))}
          </View>
        )}
        {card.bio != null && (
          <Text className="text-sm text-fg-muted" style={{ lineHeight: 22 }}>
            {card.bio}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// ── MatchOverlay ──────────────────────────────────────────────────────────────

function MatchOverlay({ card, onDismiss }: { card: DiscoverCard; onDismiss: () => void }) {
  return (
    <Modal visible animationType="fade" transparent>
      <ModalView backgroundColor="rgba(0,0,0,0.9)" className="justify-center items-center p-6">
        <View className="w-[80%] mb-8">
          <PhotoRect
            uri={card.first_photo}
            ratio={4 / 5}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          />
        </View>
        <View className="items-center gap-3 w-full">
          <Text className="text-4xl font-serif font-bold text-white">It{"'"}s a Match!</Text>
          <Text className="text-xl text-white/85 mb-2">{card.chosen_name}</Text>
          <View className="w-full gap-3">
            <PurpleButton label="Send a Message" onPress={onDismiss} />
            <PurpleButton label="Keep Swiping" onPress={onDismiss} outline />
          </View>
        </View>
      </ModalView>
    </Modal>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ tabIndex, wingerName }: { tabIndex: number; wingerName?: string }) {
  if (tabIndex === 0) {
    return (
      <View className="flex-1 justify-center items-center p-6 gap-4">
        <Text className="text-base text-fg-muted text-center" style={{ lineHeight: 24 }}>
          No one has liked you yet — check back soon.
        </Text>
      </View>
    );
  }

  const copy = wingerName
    ? `No picks from ${wingerName} yet. Ask them to swipe for you.`
    : "You're all caught up. Check back soon for new profiles.";

  return (
    <View className="flex-1 justify-center items-center p-6 gap-4">
      <Text className="text-base text-fg-muted text-center" style={{ lineHeight: 24 }}>
        {copy}
      </Text>
    </View>
  );
}

// ── DiscoverPool ──────────────────────────────────────────────────────────────
// Keyed by activeTabIndex — remounts (and re-suspends) on every tab switch.

type DiscoverPoolProps = {
  userId: string;
  activeTabIndex: number;
  wingerTabs: WingerTab[];
  tabs: string[];
  onDecrement: (() => void) | null;
};

function DiscoverPool({
  userId,
  activeTabIndex,
  wingerTabs,
  tabs,
  onDecrement,
}: DiscoverPoolProps) {
  const isAll = activeTabIndex === tabs.length - 1;
  const wingerId =
    !isAll && activeTabIndex >= 2 ? (wingerTabs[activeTabIndex - 2]?.id ?? null) : null;

  const fetchPool = useCallback<PoolFetcher>(
    (uid, pageSize, offset) => {
      if (activeTabIndex === 0) return getLikesYouPool(uid, pageSize, offset);
      return getDiscoverPool(uid, wingerId, pageSize, offset);
    },
    [activeTabIndex, wingerId]
  );

  const mode = activeTabIndex === 0 ? 'likesYou' : 'discover';
  const { data: initialPool } = useInitialPool(userId, mode, wingerId, PAGE_SIZE);

  const queryClient = useQueryClient();
  const { pool, index, like, pass } = useDiscover(fetchPool, userId, initialPool);
  const [matchCard, setMatchCard] = useState<DiscoverCard | null>(null);
  const card = pool[index] ?? null;

  async function handleLike() {
    if (!card) return;
    onDecrement?.();
    const result: LikeResult = await like();
    if (result === 'match') {
      setMatchCard(card);
      queryClient.invalidateQueries({ queryKey: ['matches', userId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    }
  }

  async function handlePass() {
    onDecrement?.();
    await pass();
  }

  return (
    <>
      <View className="flex-1">
        {card != null ? (
          <CardView card={card} />
        ) : (
          <EmptyState tabIndex={activeTabIndex} wingerName={wingerTabs[activeTabIndex - 2]?.name} />
        )}
      </View>

      {card != null && (
        <View className="flex-row justify-center items-center gap-[40px] py-5 pb-7">
          <Pressable
            className="w-16 h-16 rounded-full justify-center items-center bg-white"
            style={cardButtonShadow}
            onPress={handlePass}
          >
            <Text className="text-2xl text-fg-muted">✕</Text>
          </Pressable>
          <Pressable
            className="w-16 h-16 rounded-full justify-center items-center bg-accent"
            style={cardButtonShadow}
            onPress={handleLike}
          >
            <Text className="text-2xl text-white">♥</Text>
          </Pressable>
        </View>
      )}

      {matchCard && <MatchOverlay card={matchCard} onDismiss={() => setMatchCard(null)} />}
    </>
  );
}

// ── DiscoverContent ───────────────────────────────────────────────────────────

function DiscoverContent({ userId }: { userId: string }) {
  const { data: wingerTabs } = useWingerTabs(userId);
  const { data: initialLikesYouCount } = useLikesYouCount(userId);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [likesYouDecrements, setLikesYouDecrements] = useState(0);

  const likesYouCount = Math.max(0, initialLikesYouCount - likesYouDecrements);
  // tabs: [Likes You, For You, ...wingers, All]
  const tabs = ['Likes You', 'For You', ...wingerTabs.map((w: WingerTab) => w.name), 'All'];

  return (
    <SafeAreaView className="flex-1 bg-page">
      <LargeHeader title="Discover" />
      <TextTabBar
        tabs={tabs}
        active={activeTabIndex}
        setActive={setActiveTabIndex}
        badges={{ 0: likesYouCount }}
      />

      {/* Inner Suspense keeps the tab bar visible while the pool loads */}
      <Suspense
        fallback={
          <View className="flex-1 justify-center items-center p-6 gap-4">
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        }
      >
        <DiscoverPool
          key={activeTabIndex}
          userId={userId}
          activeTabIndex={activeTabIndex}
          wingerTabs={wingerTabs}
          tabs={tabs}
          onDecrement={activeTabIndex === 0 ? () => setLikesYouDecrements((d) => d + 1) : null}
        />
      </Suspense>
    </SafeAreaView>
  );
}

// ── DiscoverScreen ────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { userId } = useAuth();
  const {
    data: { datingProfile },
    refetch: refreshProfile,
  } = useProfileData(userId);

  if (datingProfile?.dating_status !== 'open') {
    const status =
      (datingProfile?.dating_status as Exclude<Enums<'dating_status'>, 'open'>) ?? 'break';
    return <DiscoverPausedScreen status={status} onResume={refreshProfile} />;
  }

  const prefKey = [
    datingProfile?.age_from,
    datingProfile?.age_to,
    datingProfile?.interested_gender?.join(','),
    datingProfile?.religious_preference ?? '',
  ].join('|');

  return (
    <ScreenSuspense>
      <DiscoverContent key={prefKey} userId={userId} />
    </ScreenSuspense>
  );
}
