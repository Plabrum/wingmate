import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfileData, updateDatingProfile } from '@/queries/profiles';
import { supabase } from '@/lib/supabase';
import { pickAndResizePhoto, uploadAvatar } from '@/queries/photos';

import { View, Text, Pressable, SafeAreaView } from '@/lib/tw';
import { LargeHeader } from '@/components/ui/LargeHeader';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
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

// ── Banner strip ──────────────────────────────────────────────────────────────

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

// ── Tappable avatar ──────────────────────────────────────────────────────────

function AvatarPicker({
  name,
  avatarUrl,
  size,
  userId,
}: {
  name: string | null;
  avatarUrl: string | null;
  size: number;
  userId: string;
}) {
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

// ── Winger profile screen ────────────────────────────────────────────────────

function WingerProfileInner() {
  const router = useRouter();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: { profile },
  } = useProfileData(userId);

  const { handleSubmit } = useForm();

  // ── Role = winger (pure winger, no dating profile) ───────────────────────
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
        <View className="flex-1 items-center justify-center p-10">
          <AvatarPicker
            name={profile.chosen_name}
            avatarUrl={profile.avatar_url ?? null}
            size={72}
            userId={userId}
          />
          <Text className="text-2xl font-bold text-fg mt-4 font-serif">
            {profile.chosen_name ?? 'Winger'}
          </Text>
          <Text className="text-sm text-fg-muted mt-1">Winger</Text>
          <View className="mt-8 w-full">
            <PurpleButton
              label="Wingpeople & Invitations"
              onPress={() => router.push('/(winger)/wingpeople' as any)}
              outline
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── dating_status = winging (dater paused to wing) ───────────────────────
  async function resumeDating() {
    const { error } = await updateDatingProfile(userId, { dating_status: 'open' });
    if (error) {
      toast.error("Couldn't update status. Try again.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  }

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <LargeHeader title="My Profile" right={<LogOutButton />} />
      <ProfileBanner
        title="You're in winging mode"
        sub="Tap here to resume dating."
        onPress={handleSubmit(resumeDating)}
      />
      <View className="flex-1 items-center justify-center p-10">
        <AvatarPicker
          name={profile?.chosen_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          size={72}
          userId={userId}
        />
        <Text className="text-2xl font-bold text-fg mt-4 font-serif">
          {profile?.chosen_name ?? 'Winger'}
        </Text>
        <Text className="text-sm text-fg-muted mt-1">Winger</Text>
        <View className="mt-8 w-full">
          <PurpleButton
            label="Wingpeople & Invitations"
            onPress={() => router.push('/(winger)/wingpeople' as any)}
            outline
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function WingerProfileScreen() {
  return (
    <ScreenSuspense>
      <WingerProfileInner />
    </ScreenSuspense>
  );
}
