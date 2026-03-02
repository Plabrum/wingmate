import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/profile';
import { useOwnProfile } from '@/hooks/use-own-profile';
import type { OwnDatingProfile } from '@/queries/profiles';
import { getMyWingpeople, type Wingperson } from '@/queries/contacts';

import { View, Text, Pressable, SafeAreaView } from '@/lib/tw';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { TextTabBar } from '@/components/ui/TextTabBar';
import { WingStack } from '@/components/ui/WingStack';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { AboutMeTab } from '@/components/profile/AboutMeTab';
import { PhotosTab } from '@/components/profile/PhotosTab';
import { PromptsTab } from '@/components/profile/PromptsTab';
import { ErrorBanner, getInitials } from '@/components/profile/profile-helpers';

// ── Log out button ────────────────────────────────────────────────────────────

function LogOutButton() {
  const { signOut } = useAuth();

  async function handleLogOut() {
    const { error } = await signOut();
    if (error) toast.error('Could not log out. Please try again.');
  }

  return (
    <Pressable onPress={handleLogOut} hitSlop={12}>
      <Text className="text-15 text-ink-mid">Log out</Text>
    </Pressable>
  );
}

// ── Winger view ───────────────────────────────────────────────────────────────

function WingerView({ name }: { name: string | null }) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center p-10">
      <FaceAvatar initials={getInitials(name)} size={72} />
      <Text className="text-[24px] font-bold text-ink mt-4 font-serif">{name ?? 'Winger'}</Text>
      <Text className="text-14 text-ink-mid mt-1">Winger</Text>
      <View className="mt-8 w-full">
        <PurpleButton
          label="Wingpeople & Invitations"
          onPress={() => router.push('/(tabs)/profile/wingpeople' as any)}
          outline
        />
      </View>
    </View>
  );
}

// ── Root screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { data: remoteData, loading, refresh } = useOwnProfile();

  const [activeTab, setActiveTab] = useState(0);
  const [localData, setLocalData] = useState<OwnDatingProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wingpeople, setWingpeople] = useState<Wingperson[]>([]);

  const userId = session!.user.id;

  useEffect(() => {
    setLocalData(remoteData);
  }, [remoteData]);

  useEffect(() => {
    getMyWingpeople(userId).then(({ data }) => setWingpeople(data ?? []));
  }, [userId]);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3500);
  }, []);

  const handleOptimistic = useCallback((patch: Partial<OwnDatingProfile>) => {
    setLocalData((d) => (d ? { ...d, ...patch } : d));
  }, []);

  // Roll back is the same operation — overwrite with the previous snapshot
  const handleRollback = handleOptimistic;

  if (loading && !localData) {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (profile?.role === 'winger') {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
        <LargeHeader title="My Profile" right={<LogOutButton />} />
        <WingerView name={profile.chosen_name} />
      </SafeAreaView>
    );
  }

  if (!localData) {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
        <LargeHeader title="My Profile" right={<LogOutButton />} />
        <View className="flex-1 items-center justify-center p-10">
          <Text className="text-16 text-ink-mid text-center">
            Complete your profile setup to see your profile here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const wingInitials = wingpeople.map((w) => getInitials((w as any).winger?.chosen_name));

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <LargeHeader title="My Profile" right={<LogOutButton />} />

      {/* Wingpeople row */}
      <Pressable
        className="flex-row items-center px-5 py-[10px] gap-[10px]"
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }}
        onPress={() => router.push('/(tabs)/profile/wingpeople' as any)}
      >
        {wingInitials.length > 0 ? (
          <>
            <WingStack initials={wingInitials} size={30} />
            <Text className="flex-1 text-14 font-semibold text-ink">
              {wingpeople.length} wingperson{wingpeople.length !== 1 ? 'e' : ''}
            </Text>
          </>
        ) : (
          <Text className="flex-1 text-14 text-ink-mid">No wingpeople yet — tap to invite one</Text>
        )}
        <IconSymbol name="chevron.right" size={13} color={colors.inkGhost} />
      </Pressable>

      <TextTabBar
        tabs={['About Me', 'Photos', 'Prompts']}
        active={activeTab}
        setActive={setActiveTab}
      />

      {error && <ErrorBanner message={error} />}

      {activeTab === 0 && (
        <AboutMeTab
          data={localData}
          userId={userId}
          onOptimistic={handleOptimistic}
          onRollback={handleRollback}
          onError={showError}
        />
      )}
      {activeTab === 1 && (
        <PhotosTab
          data={localData}
          userId={userId}
          onOptimistic={handleOptimistic}
          onRollback={handleRollback}
          onError={showError}
          onRefresh={refresh}
        />
      )}
      {activeTab === 2 && (
        <PromptsTab
          data={localData}
          onOptimistic={handleOptimistic}
          onRollback={handleRollback}
          onError={showError}
          onRefresh={refresh}
        />
      )}
    </SafeAreaView>
  );
}
