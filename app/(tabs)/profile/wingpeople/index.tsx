import { Suspense, useCallback, useState } from 'react';
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

import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/profile';
import { NavHeader } from '@/components/ui/NavHeader';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { getInitials } from '@/components/profile/profile-helpers';
import { View, Text, TextInput, ScrollView, SafeAreaView, Pressable } from '@/lib/tw';
import { useSuspenseQuery } from '@/lib/useSuspenseQuery';
import {
  getWingpeopleWithCounts,
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
      <Text className="text-12 font-semibold text-ink-mid uppercase tracking-[0.6px]">{title}</Text>
      {right}
    </View>
  );
}

// ── Inner content (Suspense boundary child) ────────────────────────────────────

interface ContentProps {
  userId: string;
  onRefresh: () => void;
  onOpenInvite: () => void;
}

function WingpeopleContent({ userId, onRefresh, onOpenInvite }: ContentProps) {
  const router = useRouter();
  const queryFn = useCallback(() => getWingpeopleWithCounts(userId), [userId]);
  const { wingpeople, invitations, wingingFor, weeklyCounts } = useSuspenseQuery(queryFn);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const handleAccept = async (contactId: string) => {
    const { error } = await acceptInvitation(contactId, userId);
    if (error) {
      toast.error("Couldn't accept invitation. Try again.");
    } else {
      onRefresh();
    }
  };

  const handleDecline = async (contactId: string) => {
    const { error } = await declineInvitation(contactId, userId);
    if (error) {
      toast.error("Couldn't decline invitation. Try again.");
    } else {
      onRefresh();
    }
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
            onRefresh();
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
              className="px-3 py-[5px] rounded-full bg-purple-pale"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-13 font-semibold text-purple">+ Invite</Text>
            </Pressable>
          ) : null
        }
      />

      {wingpeople.length === 0 ? (
        <Text className="text-14 text-ink-mid px-5 py-[14px] leading-5">
          No wingpeople yet. Invite a trusted friend to swipe for you.
        </Text>
      ) : (
        wingpeople.map((w) => {
          const winger = (w as any).winger as { id: string; chosen_name: string | null } | null;
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
              <FaceAvatar initials={getInitials(name)} size={40} />
              <View className="flex-1">
                <Text className="text-15 font-semibold text-ink">{name}</Text>
                <Text className="text-12 text-ink-mid mt-0.5">
                  {count} pick{count !== 1 ? 's' : ''} this week
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      {/* ── Section 2: Invitations ──────────────────────────────────────── */}
      <SectionHeader title="Invitations" />

      {invitations.length === 0 ? (
        <Text className="text-14 text-ink-mid px-5 py-[14px] leading-5">
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
              <Text className="flex-1 text-15 font-semibold text-ink">{name}</Text>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-muted"
                onPress={() => handleDecline(inv.id)}
              >
                <Text className="text-13 font-semibold text-ink-mid">Decline</Text>
              </Pressable>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-purple"
                onPress={() => handleAccept(inv.id)}
              >
                <Text className="text-13 font-semibold text-white">Accept</Text>
              </Pressable>
            </View>
          );
        })
      )}

      {/* ── Section 3: You're Winging For ──────────────────────────────── */}
      <SectionHeader title="You're Winging For" />

      {wingingFor.length === 0 ? (
        <Text className="text-14 text-ink-mid px-5 py-[14px] leading-5">
          No one has invited you to wing for them yet.
        </Text>
      ) : (
        wingingFor.map((wf) => {
          const dater = (wf as any).dater as { id: string; chosen_name: string | null } | null;
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
              <FaceAvatar initials={getInitials(name)} size={40} />
              <Text className="flex-1 text-15 font-semibold text-ink">{name}</Text>
              <Pressable
                className="px-[14px] py-2 rounded-full bg-purple-pale"
                onPress={() =>
                  router.push(`/(tabs)/profile/wingpeople/wingswipe?daterId=${dater?.id}` as any)
                }
              >
                <Text className="text-13 font-semibold text-purple">Swipe for {firstName}</Text>
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
  const { session } = useAuth();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const userId = session!.user.id;

  const [refreshKey, setRefreshKey] = useState(0);
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

  const onRefresh = () => setRefreshKey((k) => k + 1);
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
      await supabase.functions.invoke('send-wing-invite', {
        body: { phone: e164, daterName: profile?.chosen_name ?? 'Someone' },
      });
    }

    reset();
    setInviteVisible(false);
    onRefresh();
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <NavHeader back title="Wingpeople" onBack={() => router.back()} />

      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.purple} />
          </View>
        }
      >
        <WingpeopleContent
          key={refreshKey}
          userId={userId}
          onRefresh={onRefresh}
          onOpenInvite={onOpenInvite}
        />
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
              <View className="self-center w-9 h-1 rounded-full bg-ink-ghost mb-5" />
              <Text className="text-18 font-bold text-ink mb-1.5">Invite a Wingperson</Text>
              <Text className="text-14 text-ink-mid leading-5 mb-5">
                Enter their phone number and we{"'"}ll send them an invite to Orbit.
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
                      className="border-[1.5px] border-divider rounded-[12px] px-4 py-[14px] text-16 text-ink bg-white"
                      placeholder="(555) 000-0000"
                      placeholderTextColor={colors.inkGhost}
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={(t) => onChange(formatPhoneInput(t))}
                      autoFocus
                    />
                    {error && (
                      <Text className="text-[#B91C1C] text-13 mt-1.5">{error.message}</Text>
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
