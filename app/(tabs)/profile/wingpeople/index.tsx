import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/profile';
import { NavHeader } from '@/components/ui/NavHeader';
import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { getInitials } from '@/components/profile/profile-helpers';
import {
  getMyWingpeople,
  getIncomingInvitations,
  getWingingFor,
  getWingerWeeklyCount,
  inviteWingperson,
  acceptInvitation,
  declineInvitation,
  removeWingperson,
  type Wingperson,
  type IncomingInvitation,
  type WingingFor,
} from '@/queries/contacts';
import { formatPhoneInput, toE164 } from '@/lib/phoneUtils';

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={st.sectionHeader}>
      <Text style={st.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function WingpeopleScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const userId = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [wingpeople, setWingpeople] = useState<Wingperson[]>([]);
  const [invitations, setInvitations] = useState<IncomingInvitation[]>([]);
  const [wingingFor, setWingingFor] = useState<WingingFor[]>([]);
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});

  // Invite sheet state
  const [inviteVisible, setInviteVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [wpResult, invResult, wfResult] = await Promise.all([
      getMyWingpeople(userId),
      getIncomingInvitations(userId),
      getWingingFor(userId),
    ]);
    const wp = wpResult.data ?? [];
    setWingpeople(wp);
    setInvitations(invResult.data ?? []);
    setWingingFor(wfResult.data ?? []);

    // Fetch weekly pick counts for each wingperson in parallel
    const counts: Record<string, number> = {};
    await Promise.all(
      wp.map(async (w) => {
         
        const winger = (w as any).winger as { id: string } | null;
        if (winger?.id) {
          const { count } = await getWingerWeeklyCount(winger.id, userId);
          counts[w.id] = count;
        }
      })
    );
    setWeeklyCounts(counts);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const handleAccept = async (contactId: string) => {
    const inv = invitations.find((i) => i.id === contactId);
    if (!inv) return;
    // Optimistic remove from invitations
    setInvitations((prev) => prev.filter((i) => i.id !== contactId));
    const { error } = await acceptInvitation(contactId, userId);
    if (error) {
      // Rollback
      setInvitations((prev) => [inv, ...prev]);
    } else {
      // Refresh wingpeople section
      const { data } = await getMyWingpeople(userId);
      setWingpeople(data ?? []);
    }
  };

  const handleDecline = async (contactId: string) => {
    const inv = invitations.find((i) => i.id === contactId);
    if (!inv) return;
    setInvitations((prev) => prev.filter((i) => i.id !== contactId));
    const { error } = await declineInvitation(contactId, userId);
    if (error) {
      setInvitations((prev) => [inv, ...prev]);
    }
  };

  const handleRemove = (contactId: string) => {
    Alert.alert('Remove wingperson?', 'They will no longer swipe on your behalf.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const prev = wingpeople.find((w) => w.id === contactId);
          setWingpeople((wp) => wp.filter((w) => w.id !== contactId));
          const { error } = await removeWingperson(contactId, userId);
          if (error && prev) {
            setWingpeople((wp) => [...wp, prev]);
          }
        },
      },
    ]);
  };

  const handleSendInvite = async () => {
    setPhoneError(null);
    const e164 = toE164(phone);
    if (!e164) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setInviteSending(true);
    try {
      const { error: insertError } = await inviteWingperson(userId, e164);
      if (insertError) {
        setPhoneError("Couldn't send invite. Try again.");
        return;
      }

      // Check if the invitee already has an account
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', e164)
        .maybeSingle();

      if (existing?.id) {
        // Link them immediately as winger
        await supabase
          .from('contacts')
          .update({ winger_id: existing.id })
          .eq('user_id', userId)
          .eq('phone_number', e164);
      } else {
        // Send SMS invite via edge function
        await supabase.functions.invoke('send-wing-invite', {
          body: { phone: e164, daterName: profile?.chosen_name ?? 'Someone' },
        });
      }

      setInviteVisible(false);
      setPhone('');
      await loadData();
    } catch {
      setPhoneError("Couldn't send invite. Try again.");
    } finally {
      setInviteSending(false);
    }
  };

  const closeInviteSheet = () => {
    setInviteVisible(false);
    setPhone('');
    setPhoneError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <NavHeader back title="Wingpeople" onBack={() => router.back()} />
        <View style={st.loadingWrap}>
          <ActivityIndicator color={colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <NavHeader back title="Wingpeople" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={st.scroll}>
        {/* ── Section 1: Your Wingpeople ──────────────────────────────────── */}
        <SectionHeader
          title="Your Wingpeople"
          right={
            wingpeople.length < 5 ? (
              <TouchableOpacity
                onPress={() => setInviteVisible(true)}
                style={st.inviteChip}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={st.inviteChipText}>+ Invite</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {wingpeople.length === 0 ? (
          <Text style={st.empty}>
            No wingpeople yet. Invite a trusted friend to swipe for you.
          </Text>
        ) : (
          wingpeople.map((w) => {
             
            const winger = (w as any).winger as { id: string; chosen_name: string | null } | null;
            const name = winger?.chosen_name ?? 'Unknown';
            const count = weeklyCounts[w.id] ?? 0;
            return (
              <TouchableOpacity
                key={w.id}
                style={st.row}
                onLongPress={() => handleRemove(w.id)}
                delayLongPress={500}
                activeOpacity={0.85}
              >
                <FaceAvatar initials={getInitials(name)} size={40} />
                <View style={st.rowText}>
                  <Text style={st.rowName}>{name}</Text>
                  <Text style={st.rowSub}>
                    {count} pick{count !== 1 ? 's' : ''} this week
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Section 2: Invitations ──────────────────────────────────────── */}
        <SectionHeader title="Invitations" />

        {invitations.length === 0 ? (
          <Text style={st.empty}>No invitations right now.</Text>
        ) : (
          invitations.map((inv) => {
             
            const dater = (inv as any).dater as { id: string; chosen_name: string | null } | null;
            const name = dater?.chosen_name ?? 'Unknown';
            return (
              <View key={inv.id} style={st.row}>
                <FaceAvatar initials={getInitials(name)} size={40} />
                <Text style={[st.rowName, st.flex1]}>{name}</Text>
                <TouchableOpacity
                  style={[st.pill, st.pillDecline]}
                  onPress={() => handleDecline(inv.id)}
                >
                  <Text style={st.pillDeclineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.pill, st.pillAccept]}
                  onPress={() => handleAccept(inv.id)}
                >
                  <Text style={st.pillAcceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ── Section 3: You're Winging For ──────────────────────────────── */}
        <SectionHeader title="You're Winging For" />

        {wingingFor.length === 0 ? (
          <Text style={st.empty}>No one has invited you to wing for them yet.</Text>
        ) : (
          wingingFor.map((wf) => {
             
            const dater = (wf as any).dater as { id: string; chosen_name: string | null } | null;
            const name = dater?.chosen_name ?? 'Unknown';
            const firstName = name.split(' ')[0];
            return (
              <View key={wf.id} style={st.row}>
                <FaceAvatar initials={getInitials(name)} size={40} />
                <Text style={[st.rowName, st.flex1]}>{name}</Text>
                <TouchableOpacity
                  style={[st.pill, st.pillSwipe, st.pillSwipeActive]}
                  onPress={() =>
                    router.push(
                       
                      `/(tabs)/profile/wingpeople/wingswipe?daterId=${dater?.id}` as any
                    )
                  }
                >
                  <Text style={st.pillSwipeText}>Swipe for {firstName}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Invite Bottom Sheet ─────────────────────────────────────────────── */}
      <Modal
        visible={inviteVisible}
        animationType="slide"
        transparent
        onRequestClose={closeInviteSheet}
      >
        <View style={st.overlay}>
          <TouchableOpacity style={st.overlayTap} activeOpacity={1} onPress={closeInviteSheet} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={st.sheetOuter}
          >
            <View style={[st.sheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={st.handle} />
              <Text style={st.sheetTitle}>Invite a Wingperson</Text>
              <Text style={st.sheetSub}>
                Enter their phone number and we{"'"}ll send them an invite to Wingmate.
              </Text>
              <TextInput
                style={st.input}
                placeholder="(555) 000-0000"
                placeholderTextColor={colors.inkGhost}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => {
                  setPhoneError(null);
                  setPhone(formatPhoneInput(t));
                }}
                autoFocus
              />
              {phoneError && <Text style={st.inputError}>{phoneError}</Text>}
              <View style={st.sheetFooter}>
                <PurpleButton
                  label="Send Invite"
                  onPress={handleSendInvite}
                  loading={inviteSending}
                  disabled={phone.length === 0}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 48 },
  flex1: { flex: 1 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inviteChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.purplePale,
  },
  inviteChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.purple,
  },

  // Empty states
  empty: {
    fontSize: 14,
    color: colors.inkMid,
    paddingHorizontal: 20,
    paddingVertical: 14,
    lineHeight: 20,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.inkMid, marginTop: 2 },

  // Pill buttons
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillAccept: { backgroundColor: colors.purple },
  pillAcceptText: { fontSize: 13, fontWeight: '600', color: colors.white },
  pillDecline: { backgroundColor: colors.muted },
  pillDeclineText: { fontSize: 13, fontWeight: '600', color: colors.inkMid },
  pillSwipe: { backgroundColor: colors.muted },
  pillSwipeActive: { backgroundColor: colors.purplePale },
  pillSwipeText: { fontSize: 13, fontWeight: '600', color: colors.purple },

  // Invite sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  overlayTap: { flex: 1 },
  sheetOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  sheetSub: {
    fontSize: 14,
    color: colors.inkMid,
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  inputError: {
    color: '#B91C1C',
    fontSize: 13,
    marginTop: 6,
  },
  sheetFooter: { marginTop: 20 },
});
