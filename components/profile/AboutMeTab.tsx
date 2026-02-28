import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/theme';
import type { OwnDatingProfile } from '@/queries/profiles';
import { updateDatingProfile } from '@/queries/profiles';

import { Pill } from '@/components/ui/Pill';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { OptimisticHandlers } from './profile-helpers';

type DatingStatus = 'open' | 'break' | 'winging';

const STATUS_OPTIONS: { key: DatingStatus; label: string; sub: string }[] = [
  { key: 'open', label: 'Open to Dating', sub: 'Visible in Discover' },
  { key: 'break', label: 'Taking a Break', sub: 'Hidden from Discover' },
  { key: 'winging', label: 'Just Winging', sub: 'Hidden from Discover' },
];

interface Props extends OptimisticHandlers {
  data: OwnDatingProfile;
  userId: string;
}

export function AboutMeTab({ data, userId, onOptimistic, onRollback, onError }: Props) {
  const router = useRouter();

  const handleStatus = async (status: DatingStatus) => {
    const prev = data.dating_status;
    onOptimistic({ dating_status: status });
    try {
      const { error } = await updateDatingProfile(userId, { dating_status: status });
      if (error) throw error;
    } catch {
      onRollback({ dating_status: prev });
      onError('Could not update status. Please try again.');
    }
  };

  const detailRows = [
    { label: 'City', value: data.city },
    { label: 'Religion', value: data.religion },
    {
      label: 'Age range',
      value: data.age_to ? `${data.age_from}–${data.age_to}` : `${data.age_from}+`,
    },
    {
      label: 'Interested in',
      value: data.interested_gender.length ? data.interested_gender.join(', ') : '—',
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={st.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={st.sectionLabel}>Dating Status</Text>
      <View style={st.card}>
        {STATUS_OPTIONS.map((opt, i) => {
          const active = data.dating_status === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleStatus(opt.key)}
              style={[st.statusRow, i < STATUS_OPTIONS.length - 1 && st.rowBorder]}
              activeOpacity={0.7}
            >
              <View style={st.flex1}>
                <Text style={[st.statusLabel, active && st.statusLabelActive]}>{opt.label}</Text>
                <Text style={st.statusSub}>{opt.sub}</Text>
              </View>
              <View style={[st.radio, active && st.radioActive]}>
                {active && <View style={st.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {data.dating_status !== 'open' && (
        <View style={st.callout}>
          <IconSymbol name="eye.slash" size={15} color={colors.purple} />
          <Text style={st.calloutText}>
            Your profile is hidden from Discover while you{"'"}re{' '}
            {data.dating_status === 'break' ? 'on a break' : 'just winging'}.
          </Text>
        </View>
      )}

      <Text style={st.sectionLabel}>Details</Text>
      <View style={st.card}>
        {detailRows.map((row, i) => (
          <View
            key={row.label}
            style={[st.detailRow, i < detailRows.length - 1 && st.rowBorder]}
          >
            <Text style={st.detailLabel}>{row.label}</Text>
            <Text style={st.detailValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {data.bio ? (
        <>
          <Text style={st.sectionLabel}>Bio</Text>
          <View style={[st.card, st.bioPad]}>
            <Text style={st.bioText}>{data.bio}</Text>
          </View>
        </>
      ) : null}

      {data.interests.length > 0 && (
        <>
          <Text style={st.sectionLabel}>Interests</Text>
          <View style={st.pillsRow}>
            {data.interests.map((interest) => (
              <Pill key={interest} label={interest} />
            ))}
          </View>
        </>
      )}

      <View style={st.editBtn}>
        <PurpleButton
          label="Edit Profile"
           
          onPress={() => router.push('/(tabs)/profile/edit' as any)}
          outline
        />
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  flex1: { flex: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },
  card: { backgroundColor: colors.white, borderRadius: 14, overflow: 'hidden' },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  statusLabel: { fontSize: 15, fontWeight: '500', color: colors.ink },
  statusLabelActive: { color: colors.purple },
  statusSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.inkGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.purple },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.purple },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.purplePale,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  calloutText: { flex: 1, fontSize: 13, color: colors.purple, lineHeight: 18 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  detailLabel: { fontSize: 15, color: colors.inkMid },
  detailValue: { fontSize: 15, fontWeight: '500', color: colors.ink },
  bioPad: { padding: 14 },
  bioText: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  editBtn: { marginTop: 28 },
});
