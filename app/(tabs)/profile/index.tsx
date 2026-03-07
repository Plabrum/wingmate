import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { useForm } from 'react-hook-form';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfileData } from '@/queries/profiles';
import type { OwnDatingProfile } from '@/queries/profiles';
import { useMyWingpeople } from '@/queries/contacts';

import { View, Text, Pressable, SafeAreaView } from '@/lib/tw';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { TextTabBar } from '@/components/ui/TextTabBar';
import { WingStack } from '@/components/ui/WingStack';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

import { AboutMeTab } from '@/components/profile/AboutMeTab';
import { PhotosTab } from '@/components/profile/PhotosTab';
import { PromptsTab } from '@/components/profile/PromptsTab';
import { getInitials } from '@/components/profile/profile-helpers';

// ── Log out button ────────────────────────────────────────────────────────────

function LogOutButton() {
  const { signOut } = useAuth();

  async function handleLogOut() {
    const { error } = await signOut();
    if (error) toast.error('Could not log out. Please try again.');
  }

  return (
    <Pressable onPress={handleLogOut} hitSlop={12}>
      <Text className="text-sm text-fg-muted">Log out</Text>
    </Pressable>
  );
}

// ── Winger view ───────────────────────────────────────────────────────────────

function WingerView({ name }: { name: string | null }) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center p-10">
      <FaceAvatar initials={getInitials(name)} size={72} />
      <Text className="text-2xl font-bold text-fg mt-4 font-serif">{name ?? 'Winger'}</Text>
      <Text className="text-sm text-fg-muted mt-1">Winger</Text>
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

function ProfileScreenInner() {
  const router = useRouter();
  const { userId } = useAuth();

  const {
    data: { profile, datingProfile },
    refetch,
  } = useProfileData(userId);

  const { data: wingpeople } = useMyWingpeople(userId);

  const [activeTab, setActiveTab] = useState(0);

  const form = useForm<OwnDatingProfile>({ defaultValues: datingProfile ?? undefined });

  const dating_status = form.watch('dating_status');

  const handleRefresh = useCallback(async () => {
    const result = await refetch();
    if (result.data?.datingProfile) form.reset(result.data.datingProfile);
  }, [refetch, form]);

  if (profile?.role === 'winger') {
    return (
      <SafeAreaView className="flex-1 bg-page" edges={['top']}>
        <LargeHeader title="My Profile" right={<LogOutButton />} />
        <WingerView name={profile.chosen_name} />
      </SafeAreaView>
    );
  }

  if (!datingProfile) return null; // routing should prevent this

  const wingInitials = wingpeople.map((w) => getInitials((w as any).winger?.chosen_name));

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
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
            <Text className="flex-1 text-sm font-semibold text-fg">
              {wingpeople.length} wingperson{wingpeople.length !== 1 ? 'e' : ''}
            </Text>
          </>
        ) : (
          <Text className="flex-1 text-sm text-fg-muted">
            No wingpeople yet — tap to invite one
          </Text>
        )}
        <IconSymbol name="chevron.right" size={13} color={colors.inkGhost} />
      </Pressable>

      {dating_status === 'winging' ? (
        <AboutMeTab form={form} data={datingProfile} userId={userId} />
      ) : (
        <>
          <TextTabBar
            tabs={['About Me', 'Photos', 'Prompts']}
            active={activeTab}
            setActive={setActiveTab}
          />
          {activeTab === 0 && <AboutMeTab form={form} data={datingProfile} userId={userId} />}
          {activeTab === 1 && (
            <PhotosTab form={form} data={datingProfile} userId={userId} onRefresh={handleRefresh} />
          )}
          {activeTab === 2 && (
            <PromptsTab form={form} data={datingProfile} onRefresh={handleRefresh} />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

export default function ProfileScreen() {
  return (
    <ScreenSuspense>
      <ProfileScreenInner />
    </ScreenSuspense>
  );
}
