import { Suspense, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import Splash from '@/components/ui/Splash';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import * as SMS from 'expo-sms';
import { Ionicons } from '@expo/vector-icons';

import { useQueryClient } from '@tanstack/react-query';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { Sprout } from '@/components/ui/Sprout';
import { View, Text, TextInput, ScrollView, SafeAreaView, Pressable } from '@/lib/tw';
import { useGetApiProfilesMeSuspense } from '@/lib/api/generated/profiles/profiles';
import {
  getGetApiWingpeopleQueryKey,
  useDeleteApiWingpeopleId,
  useGetApiWingpeopleSuspense,
  usePostApiWingpeopleIdAccept,
  usePostApiWingpeopleIdDecline,
  usePostApiWingpeopleInvite,
} from '@/lib/api/generated/contacts/contacts';
import { formatPhoneInput, toE164 } from '@/lib/phoneUtils';

const INK = '#1F1B16';
const INK3 = '#8B8170';
const PAPER = '#FBF8F1';
const LINE = 'rgba(31,27,22,0.10)';
const LEAF = '#5A8C3A';
const LEAF_SOFT = 'rgba(90,140,58,0.12)';

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      className="text-ink-dim"
      style={{
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        fontWeight: '600',
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

// ── Inner content (Suspense boundary child) ────────────────────────────────────

interface ContentProps {
  onOpenInvite: () => void;
}

function WingpeopleContent({ onOpenInvite }: ContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useGetApiWingpeopleSuspense();
  const { wingpeople, invitations, wingingFor, sentInvitations, weeklyCounts } = data;

  const acceptMutation = usePostApiWingpeopleIdAccept();
  const declineMutation = usePostApiWingpeopleIdDecline();
  const removeMutation = useDeleteApiWingpeopleId();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiWingpeopleQueryKey() });

  const handleAccept = async (contactId: string) => {
    const result = await acceptMutation.mutateAsync({ id: contactId }).catch(() => null);
    if (result == null) {
      toast.error("Couldn't accept invitation. Try again.");
      return;
    }
    invalidate();
  };

  const handleDecline = async (contactId: string) => {
    const result = await declineMutation.mutateAsync({ id: contactId }).catch(() => null);
    if (result == null) {
      toast.error("Couldn't decline invitation. Try again.");
      return;
    }
    invalidate();
  };

  const handleCancelInvite = (contactId: string) => {
    Alert.alert('Cancel invite?', 'This will withdraw the invitation.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Invite',
        style: 'destructive',
        onPress: async () => {
          const result = await removeMutation.mutateAsync({ id: contactId }).catch(() => null);
          if (result == null) {
            toast.error("Couldn't cancel invite. Try again.");
            return;
          }
          invalidate();
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
          const result = await removeMutation.mutateAsync({ id: contactId }).catch(() => null);
          if (result == null) {
            toast.error("Couldn't remove wingperson. Try again.");
            return;
          }
          invalidate();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ── Section 1: Your Wingpeople ─────────────────────────────────────── */}
      <SectionLabel>{`Your wingpeople · ${wingpeople.length} of 5`}</SectionLabel>

      {wingpeople.length === 0 ? (
        <Text
          className="text-ink-dim"
          style={{
            fontSize: 13,
            paddingHorizontal: 16,
            paddingVertical: 12,
            lineHeight: 20,
          }}
        >
          No wingpeople yet. Invite a trusted friend to swipe for you.
        </Text>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {wingpeople.map((w) => {
            const name = w.winger?.chosenName ?? 'Unknown';
            const count = weeklyCounts[w.id] ?? 0;
            return (
              <Pressable
                key={w.id}
                onLongPress={() => handleRemove(w.id)}
                delayLongPress={500}
                className="bg-surface"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: LINE,
                }}
              >
                <FaceAvatar name={name} size={44} photoUri={w.winger?.avatarUrl ?? null} />
                <View style={{ flex: 1 }}>
                  <Text className="text-ink" style={{ fontSize: 14.5, fontWeight: '600' }}>
                    {name}
                  </Text>
                  <Text className="text-ink-dim" style={{ fontSize: 12, marginTop: 2 }}>
                    {count} pick{count !== 1 ? 's' : ''} this week
                  </Text>
                </View>
                <Pressable hitSlop={8} style={{ padding: 6 }} onPress={() => handleRemove(w.id)}>
                  <Ionicons name="ellipsis-vertical" size={18} color={INK3} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Section 2: Sent Invites ─────────────────────────────────────────── */}
      {sentInvitations.length > 0 && (
        <>
          <SectionLabel>{`Sent invites · ${sentInvitations.length}`}</SectionLabel>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {sentInvitations.map((inv) => {
              const displayName = inv.winger?.chosenName ?? inv.phoneNumber ?? 'Unknown';
              return (
                <View
                  key={inv.id}
                  className="bg-surface"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: LINE,
                  }}
                >
                  <FaceAvatar name={displayName} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text className="text-ink" style={{ fontSize: 14.5, fontWeight: '600' }}>
                      {displayName}
                    </Text>
                    <Text className="text-ink-dim" style={{ fontSize: 12, marginTop: 2 }}>
                      Invite pending
                    </Text>
                  </View>
                  <Sprout size="sm" variant="secondary" onPress={() => handleCancelInvite(inv.id)}>
                    Cancel
                  </Sprout>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Section 3: Invitations ──────────────────────────────────────────── */}
      {invitations.length > 0 && (
        <>
          <SectionLabel>{`Invitations · ${invitations.length}`}</SectionLabel>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {invitations.map((inv) => {
              const name = inv.dater?.chosenName ?? 'Unknown';
              const firstName = name.split(' ')[0] || name;
              return (
                <View
                  key={inv.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: LEAF_SOFT,
                    borderRadius: 16,
                  }}
                >
                  <FaceAvatar name={name} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text className="text-ink" style={{ fontSize: 14, fontWeight: '600' }}>
                      {firstName} wants you to wing
                    </Text>
                    <Text className="text-ink-mid" style={{ fontSize: 12, marginTop: 2 }}>
                      You{"'"}d help curate {firstName}
                      {"'"}s feed.
                    </Text>
                  </View>
                  <Sprout size="sm" variant="secondary" onPress={() => handleDecline(inv.id)}>
                    Decline
                  </Sprout>
                  <Sprout size="sm" onPress={() => handleAccept(inv.id)}>
                    Accept
                  </Sprout>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Section 4: You're Winging For ──────────────────────────────────── */}
      {wingingFor.length > 0 && (
        <>
          <SectionLabel>{`You're winging for`}</SectionLabel>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {wingingFor.map((wf) => {
              const name = wf.dater?.chosenName ?? 'Unknown';
              const firstName = name.split(' ')[0] || name;
              const daterId = wf.dater?.id;
              return (
                <View
                  key={wf.id}
                  className="bg-surface"
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: LINE,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <FaceAvatar name={name} size={48} photoUri={wf.dater?.avatarUrl ?? null} />
                    <View style={{ flex: 1 }}>
                      <Text className="text-ink" style={{ fontSize: 15, fontWeight: '600' }}>
                        {name}
                      </Text>
                      <Text className="text-ink-dim" style={{ fontSize: 12, marginTop: 2 }}>
                        Help {firstName} build their profile and find matches.
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Sprout
                        block
                        size="sm"
                        variant="secondary"
                        onPress={() =>
                          router.push(
                            `/(tabs)/profile/wingpeople/contribute?daterId=${daterId}` as any
                          )
                        }
                      >
                        Add to profile
                      </Sprout>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Sprout
                        block
                        size="sm"
                        icon={<Ionicons name="heart" size={14} color={PAPER} />}
                        onPress={() =>
                          router.push(
                            `/(tabs)/profile/wingpeople/wingswipe?daterId=${daterId}` as any
                          )
                        }
                      >
                        Swipe for {firstName}
                      </Sprout>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Outer screen (owns modal + form state) ─────────────────────────────────────

type InviteForm = { phone: string };

export default function WingpeopleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: profile } = useGetApiProfilesMeSuspense();

  const [inviteVisible, setInviteVisible] = useState(false);

  const inviteMutation = usePostApiWingpeopleInvite();

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

    const result = await inviteMutation
      .mutateAsync({ data: { phoneNumber: e164 } })
      .catch(() => null);
    if (result == null) {
      toast.error("Couldn't send invite. Try again.");
      return;
    }

    if (result.wingerId == null) {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const daterName = profile?.chosenName ?? 'Someone';
        const appUrl = 'https://apps.apple.com/app/pear/id6744145981';
        await SMS.sendSMSAsync(
          [e164],
          `${daterName} invited you to be their wingperson on Pear! Download the app: ${appUrl}`
        );
      } else {
        toast.error('SMS is not available on this device.');
      }
    }

    queryClient.invalidateQueries({ queryKey: getGetApiWingpeopleQueryKey() });
    closeInviteSheet();
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View
        className="flex-row items-center"
        style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 4 }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ padding: 8, marginLeft: -4 }}
        >
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text
          className="font-serif text-ink"
          style={{ fontSize: 26, letterSpacing: -0.4, flex: 1 }}
        >
          Wingpeople
        </Text>
        <Sprout
          size="sm"
          icon={<Ionicons name="add" size={14} color={PAPER} />}
          onPress={onOpenInvite}
        >
          Invite
        </Sprout>
      </View>

      <Suspense fallback={<Splash variant="spinner" />}>
        <WingpeopleContent onOpenInvite={onOpenInvite} />
      </Suspense>

      {/* ── Invite Bottom Sheet ──────────────────────────────────────────────── */}
      <Modal
        visible={inviteVisible}
        animationType="slide"
        transparent
        onRequestClose={closeInviteSheet}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(31,27,22,0.45)' }}>
          <Pressable className="flex-1" onPress={closeInviteSheet} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
          >
            <View
              className="bg-canvas"
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View
                style={{
                  alignSelf: 'center',
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: LINE,
                  marginBottom: 14,
                }}
              />
              <Text
                className="font-serif text-ink"
                style={{ fontSize: 24, letterSpacing: -0.4, lineHeight: 28 }}
              >
                Invite a wingperson
              </Text>
              <Text
                className="text-ink-dim"
                style={{ fontSize: 13, marginTop: 6, marginBottom: 14 }}
              >
                Enter their phone number — we{"'"}ll text them an invite.
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
                      className="bg-surface text-ink"
                      style={{
                        borderWidth: 1,
                        borderColor: LINE,
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        fontSize: 14,
                      }}
                      placeholder="(555) 000-0000"
                      placeholderTextColor={INK3}
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={(t) => onChange(formatPhoneInput(t))}
                      autoFocus
                    />
                    {error && (
                      <Text className="text-destructive" style={{ fontSize: 13, marginTop: 6 }}>
                        {error.message}
                      </Text>
                    )}
                  </>
                )}
              />

              <View style={{ marginTop: 14 }}>
                <Sprout
                  block
                  onPress={onSendInvite}
                  loading={isSubmitting}
                  disabled={!isValid || isSubmitting}
                >
                  Send invite
                </Sprout>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Suppress unused-warning (kept import path of StyleSheet for any future tweaks)
const _ = StyleSheet;
