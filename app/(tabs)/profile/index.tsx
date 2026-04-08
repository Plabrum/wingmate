import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfileData, updateDatingProfile } from '@/queries/profiles';
import type { OwnDatingProfile } from '@/queries/profiles';
import { useMyWingpeople } from '@/queries/contacts';
import { supabase } from '@/lib/supabase';
import { pickAndResizePhoto, uploadAvatar } from '@/queries/photos';

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

// ── Shared banner strip ───────────────────────────────────────────────────────

function ProfileBanner({
  title,
  sub,
  onPress,
}: {
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 px-5 py-4 bg-purple-pale"
      style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }}
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-accent">{title}</Text>
        <Text className="text-xs text-accent/70 mt-0.5">{sub}</Text>
      </View>
      <IconSymbol name="chevron.right" size={13} color={colors.purple} />
    </Pressable>
  );
}

// ── Tappable avatar (shared by dater + winger) ────────────────────────────────

type AvatarPickerProps = {
  name: string | null;
  avatarUrl: string | null;
  size: number;
  userId: string;
};

function AvatarPicker({ name, avatarUrl, size, userId }: AvatarPickerProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    const uri = await pickAndResizePhoto({ width: 400, aspect: [1, 1] });
    if (!uri) return;

    setUploading(true);
    const { error } = await uploadAvatar(userId, uri);
    setUploading(false);
    if (error) {
      toast.error("Couldn't upload photo. Try again.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  };

  return (
    <Pressable onPress={handlePick} className="relative" style={{ width: size, height: size }}>
      <FaceAvatar initials={getInitials(name)} size={size} photoUri={avatarUrl} />
      {uploading ? (
        <View
          className="absolute inset-0 items-center justify-center rounded-full bg-black/40"
          style={{ borderRadius: size / 2 }}
        >
          <IconSymbol name="arrow.clockwise" size={size * 0.3} color="white" />
        </View>
      ) : (
        <View
          className="absolute bottom-0 right-0 items-center justify-center bg-white rounded-full"
          style={{ width: size * 0.32, height: size * 0.32, borderRadius: (size * 0.32) / 2 }}
        >
          <IconSymbol name="camera.fill" size={size * 0.17} color={colors.purple} />
        </View>
      )}
    </Pressable>
  );
}

// ── Winger view (shared by role=winger and dating_status=winging) ─────────────

function WingerView({
  name,
  userId,
  avatarUrl,
}: {
  name: string | null;
  userId: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center p-10">
      <AvatarPicker name={name} avatarUrl={avatarUrl} size={72} userId={userId} />
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
  const queryClient = useQueryClient();

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

  // ── Role = winger ─────────────────────────────────────────────────────────
  if (profile?.role === 'winger') {
    const handleSwitchToDater = async () => {
      const { error } = await supabase.from('profiles').update({ role: 'dater' }).eq('id', userId);
      if (error) {
        toast.error("Couldn't switch profile. Try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    };

    return (
      <SafeAreaView className="flex-1 bg-page" edges={['top']}>
        <LargeHeader title="My Profile" right={<LogOutButton />} />
        <ProfileBanner
          title="Want to start dating too?"
          sub="Set up a dater profile and start swiping."
          onPress={handleSwitchToDater}
        />
        <WingerView
          name={profile.chosen_name}
          userId={userId}
          avatarUrl={profile.avatar_url ?? null}
        />
      </SafeAreaView>
    );
  }

  if (!datingProfile) return null; // routing should prevent this

  // ── dating_status = winging ───────────────────────────────────────────────
  if (dating_status === 'winging') {
    const handleResumeDating = async () => {
      form.setValue('dating_status', 'open');
      const { error } = await updateDatingProfile(userId, { dating_status: 'open' });
      if (error) {
        form.setValue('dating_status', 'winging');
        toast.error("Couldn't update status. Try again.");
      }
    };

    return (
      <SafeAreaView className="flex-1 bg-page" edges={['top']}>
        <LargeHeader title="My Profile" right={<LogOutButton />} />
        <ProfileBanner
          title="You're in winging mode"
          sub="Tap here to create a dating profile."
          onPress={handleResumeDating}
        />
        <WingerView
          name={profile?.chosen_name ?? null}
          userId={userId}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </SafeAreaView>
    );
  }

  // ── Dater view ────────────────────────────────────────────────────────────
  const wingItems = wingpeople.map((w) => ({
    initials: getInitials((w as any).winger?.chosen_name),
    photoUri: (w as any).winger?.avatar_url ?? null,
  }));

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <LargeHeader title="My Profile" right={<LogOutButton />} />

      {/* Avatar + wingpeople row */}
      <View
        className="flex-row items-center px-5 py-[10px] gap-3"
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }}
      >
        <AvatarPicker
          name={profile?.chosen_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          size={44}
          userId={userId}
        />
        <Pressable
          className="flex-1 flex-row items-center gap-[10px]"
          onPress={() => router.push('/(tabs)/profile/wingpeople' as any)}
        >
          {wingItems.length > 0 ? (
            <>
              <WingStack items={wingItems} size={30} />
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
      </View>

      <TextTabBar
        tabs={['About Me', 'Photos', 'Prompts']}
        active={activeTab}
        setActive={setActiveTab}
      />
      {activeTab === 0 && <AboutMeTab form={form} data={datingProfile} userId={userId} />}
      {activeTab === 1 && (
        <PhotosTab form={form} data={datingProfile} userId={userId} onRefresh={handleRefresh} />
      )}
      {activeTab === 2 && <PromptsTab form={form} data={datingProfile} onRefresh={handleRefresh} />}
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
