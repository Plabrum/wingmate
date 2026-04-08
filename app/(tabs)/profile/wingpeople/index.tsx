import { Suspense, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import * as SMS from 'expo-sms';

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { NavHeader } from '@/components/ui/NavHeader';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { getInitials } from '@/components/profile/profile-helpers';
import { View, Text, TextInput, ScrollView, SafeAreaView, Pressable } from '@/lib/tw';
import { useProfileData } from '@/queries/profiles';
import {
  useWingpeopleData,
  inviteWingperson,
  acceptInvitation,
  declineInvitation,
  removeWingperson,
} from '@/queries/contacts';
import { formatPhoneInput, toE164 } from '@/lib/phoneUtils';

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-5 pt-6 pb-2">
      <Text className="text-xs font-semibold text-fg-muted uppercase tracking-[0.6px]">
        {title}
      </Text>
      {right}
    </View>
  );
}

// ── Inner content (Suspense boundary child) ────────────────────────────────────

interface ContentProps {
  userId: string;
  onOpenInvite: () => void;
}

function WingpeopleContent({ userId, onOpenInvite }: ContentProps) {
  const router = useRouter();
  const {
    data: { wingpeople, invitations, wingingFor, sentInvitations, weeklyCounts },
    refetch,
  } = useWingpeopleData(userId);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const handleAccept = async (contactId: string) => {
    const { error } = await acceptInvitation(contactId, userId);
    if (error) {
      toast.error("Couldn't accept invitation. Try again.");
    } else {
      refetch();
    }
  };

  const handleDecline = async (contactId: string) => {
    const { error } = await declineInvitation(contactId, userId);
    if (error) {
      toast.error("Couldn't decline invitation. Try again.");
    } else {
      refetch();
    }
  };

  const handleCancelInvite = (contactId: string) => {
    Alert.alert('Cancel invite?', 'This will withdraw the invitation.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Invite',
        style: 'destructive',
        onPress: async () => {
          const { error } = await removeWingperson(contactId, userId);
          if (error) {
            toast.error("Couldn't cancel invite. Try again.");
          } else {
            refetch();
          }
        },
      },
    ]);
  };

  const handleRemove = (contactId: string) => {
    Alert.alert('Remove wingperson?', 'They will no longer swipe on your behalf.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await removeWingperson(contactId, userId);
          if (error) {
            toast.error("Couldn't remove wingperson. Try again.");
          } else {
            refetch();
          }
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView contentContainerClassName="pb-12">
      {/* ── Section 1: Your Wingpeople ────────────────────────────────────── */}
      <SectionHeader
        title="Your Wingpeople"
        right={
          wingpeople.length < 5 ? (
            <Pressable
              onPress={onOpenInvite}
              className="px-3 py-[5px] rounded-full bg-accent-muted"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-sm font-semibold text-accent">+ Invite</Text>
            </Pressable>
          ) : null
        }
      />

      {wingpeople.length === 0 ? (
        <Text className="text-sm text-fg-muted px-5 py-[14px] leading-5">
          No wingpeople yet. Invite a trusted friend to swipe for you.
        </Text>
      ) : (
        wingpeople.map((w) => {
          const winger = (w as any).winger as {
            id: string;
            chosen_name: string | null;
            avatar_url: string | null;
          } | null;
          const name = winger?.chosen_name ?? 'Unknown';
          const count = weeklyCounts[w.id] ?? 0;
          return (
            <Pressable
              key={w.id}
              className="flex-row items-center px-5 py-3 gap-3 bg-white"
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.divider,
              }}
              onLongPress={() => handleRemove(w.id)}
              delayLongPress={500}
            >
              <FaceAvatar initials={getInitials(name)} size={40} photoUri={winger?.avatar_url} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-fg">{name}</Text>
                <Text className="text-xs text-fg-muted mt-0.5">
                  {count} pick{count !== 1 ? 's' : ''} this week
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      {/* ── Section 2: Sent Invites ────────────────────────────────────── */}
      {sentInvitations.length > 0 && (
        <>
          <SectionHeader title="Sent Invites" />
          {sentInvitations.map((inv) => {
            const winger = (inv as any).winger as { id: string; chosen_name: string | null } | null;
            const displayName = winger?.chosen_name ?? inv.phone_number ?? 'Unknown';
            return (
              <View
                key={inv.id}
                className="flex-row items-center px-5 py-3 gap-3 bg-white"
                style={{
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.divider,
                }}
              >
                <FaceAvatar initials={getInitials(displayName)} size={40} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-fg">{displayName}</Text>
                  <Text className="text-xs text-fg-muted mt-0.5">Invite pending</Text>
                </View>
                <Pressable
                  className="px-[14px] py-2 rounded-full bg-surface"
                  onPress={() => handleCancelInvite(inv.id)}
                >
                  <Text className="text-sm font-semibold text-fg-muted">Cancel</Text>
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      {/* ── Section 3: Invitations ──────────────────────────────────────── */}
      <SectionHeader title="Invitations" />

      {invitations.length === 0 ? (
        <Text className="text-sm text-fg-muted px-5 py-[14px] leading-5">
          No invitations right now.
        </Text>
      ) : (
        invitations.map((inv) => {
          const dater = (inv as any).dater as { id: string; chosen_name: string | null } | null;
          const name = dater?.chosen_name ?? 'Unknown';
          return (
            <View
              key={inv.id}
              className="flex-row items-center px-5 py-3 gap-3 bg-white"
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.divider,
              }}
            >
              <FaceAvatar initials={getInitials(name)} size={40} />
              <Text className="flex-1 text-sm font-semibold text-fg">{name}</Text>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-surface"
                onPress={() => handleDecline(inv.id)}
              >
                <Text className="text-sm font-semibold text-fg-muted">Decline</Text>
              </Pressable>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-accent"
                onPress={() => handleAccept(inv.id)}
              >
                <Text className="text-sm font-semibold text-white">Accept</Text>
              </Pressable>
            </View>
          );
        })
      )}

      {/* ── Section 4: You're Winging For ──────────────────────────────── */}
      <SectionHeader title="You're Winging For" />

      {wingingFor.length === 0 ? (
        <Text className="text-sm text-fg-muted px-5 py-[14px] leading-5">
          No one has invited you to wing for them yet.
        </Text>
      ) : (
        wingingFor.map((wf) => {
          const dater = (wf as any).dater as {
            id: string;
            chosen_name: string | null;
            avatar_url: string | null;
          } | null;
          const name = dater?.chosen_name ?? 'Unknown';
          const firstName = name.split(' ')[0];
          return (
            <View
              key={wf.id}
              className="flex-row items-center px-5 py-3 gap-3 bg-white"
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.divider,
              }}
            >
              <FaceAvatar initials={getInitials(name)} size={40} photoUri={dater?.avatar_url} />
              <Text className="flex-1 text-sm font-semibold text-fg">{name}</Text>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-accent-muted"
                onPress={() =>
                  router.push(
                    `/(tabs)/profile/wingpeople/dater-profile?daterId=${dater?.id}` as any
                  )
                }
              >
                <Text className="text-sm font-semibold text-accent">Add to profile</Text>
              </Pressable>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-accent-muted"
                onPress={() =>
                  router.push(`/(tabs)/profile/wingpeople/wingswipe?daterId=${dater?.id}` as any)
                }
              >
                <Text className="text-sm font-semibold text-accent">Swipe for {firstName}</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ── Outer screen (owns modal + form state) ─────────────────────────────────────

type InviteForm = { phone: string };

export default function WingpeopleScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    data: { profile },
  } = useProfileData(userId);

  const [inviteVisible, setInviteVisible] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isValid },
  } = useForm<InviteForm>({
    defaultValues: { phone: '' },
    mode: 'onChange',
  });

  const onOpenInvite = () => setInviteVisible(true);
  const closeInviteSheet = () => {
    setInviteVisible(false);
    reset();
  };

  const onSendInvite = handleSubmit(async ({ phone }) => {
    const e164 = toE164(phone)!;

    const { error: insertError } = await inviteWingperson(userId, e164);
    if (insertError) {
      toast.error("Couldn't send invite. Try again.");
      return;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', e164)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('contacts')
        .update({ winger_id: existing.id })
        .eq('user_id', userId)
        .eq('phone_number', e164);
    } else {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const daterName = profile?.chosen_name ?? 'Someone';
        const appUrl = 'https://apps.apple.com/app/wyng/id6744145981';
        await SMS.sendSMSAsync(
          [e164],
          `${daterName} invited you to be their wingperson on Wyng! Download the app: ${appUrl}`
        );
      } else {
        toast.error('SMS is not available on this device.');
      }
    }

    queryClient.invalidateQueries({ queryKey: ['wingpeople', userId] });
    closeInviteSheet();
  });

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <NavHeader back title="Wingpeople" onBack={() => router.back()} />

      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.purple} />
          </View>
        }
      >
        <WingpeopleContent userId={userId} onOpenInvite={onOpenInvite} />
      </Suspense>

      {/* ── Invite Bottom Sheet ──────────────────────────────────────────────── */}
      <Modal
        visible={inviteVisible}
        animationType="slide"
        transparent
        onRequestClose={closeInviteSheet}
      >
        <View className="flex-1 bg-black/45">
          <Pressable className="flex-1" onPress={closeInviteSheet} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          >
            <View
              className="bg-white rounded-t-[20px] px-6 pt-3"
              style={{ paddingBottom: insets.bottom + 20 }}
            >
              <View className="self-center w-9 h-1 rounded-full bg-fg-ghost mb-5" />
              <Text className="text-lg font-bold text-fg mb-1.5">Invite a Wingperson</Text>
              <Text className="text-sm text-fg-muted leading-5 mb-5">
                Enter their phone number and we{"'"}ll open a text for you to send.
              </Text>

              <Controller
                control={control}
                name="phone"
                rules={{
                  required: true,
                  validate: (v) => Boolean(toE164(v)) || 'Please enter a valid phone number.',
                }}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      className="border-[1.5px] border-separator rounded-xl px-4 py-[14px] text-base text-fg bg-white"
                      placeholder="(555) 000-0000"
                      placeholderTextColor={colors.inkGhost}
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={(t) => onChange(formatPhoneInput(t))}
                      autoFocus
                    />
                    {error && (
                      <Text className="text-[#B91C1C] text-sm mt-1.5">{error.message}</Text>
                    )}
                  </>
                )}
              />

              <View className="mt-5">
                <PurpleButton
                  label="Send Invite"
                  onPress={onSendInvite}
                  loading={isSubmitting}
                  disabled={!isValid || isSubmitting}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
