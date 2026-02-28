import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useOwnProfile } from '@/hooks/use-own-profile';
import { updateDatingProfile } from '@/queries/profiles';
import type { Database } from '@/types/database';

import { NavHeader } from '@/components/ui/NavHeader';
import { PurpleButton } from '@/components/ui/PurpleButton';

type Gender = Database['public']['Enums']['gender'];
type Religion = Database['public']['Enums']['religion'];
type City = Database['public']['Enums']['city'];
type Interest = Database['public']['Enums']['interest'];

const GENDERS: Gender[] = ['Male', 'Female', 'Non-Binary'];

const RELIGIONS: Religion[] = [
  'Muslim',
  'Christian',
  'Jewish',
  'Hindu',
  'Buddhist',
  'Sikh',
  'Agnostic',
  'Atheist',
  'Other',
  'Prefer not to say',
];

const CITIES: City[] = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];

const INTERESTS: Interest[] = [
  'Travel',
  'Fitness',
  'Cooking',
  'Music',
  'Art',
  'Movies',
  'Books',
  'Gaming',
  'Outdoors',
  'Sports',
  'Technology',
  'Fashion',
  'Food',
  'Photography',
  'Dance',
  'Volunteering',
];

const RELIGIOUS_PREFS: { value: Religion | null; label: string }[] = [
  { value: null, label: 'No preference' },
  { value: 'Muslim', label: 'Must be Muslim' },
  { value: 'Christian', label: 'Must be Christian' },
  { value: 'Jewish', label: 'Must be Jewish' },
  { value: 'Hindu', label: 'Must be Hindu' },
  { value: 'Buddhist', label: 'Must be Buddhist' },
  { value: 'Sikh', label: 'Must be Sikh' },
];

// ── Mini components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={st.sectionLabel}>{label}</Text>;
}

function PickerRow<T extends string>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  getLabel?: (v: T) => string;
}) {
  return (
    <View style={st.pickerGrid}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[st.pickerChip, active && st.pickerChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[st.pickerChipTxt, active && st.pickerChipTxtActive]}>
              {getLabel ? getLabel(opt) : opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiPickerRow<T extends string>({
  options,
  values,
  onChange,
}: {
  options: T[];
  values: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (opt: T) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  };
  return (
    <View style={st.pickerGrid}>
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => toggle(opt)}
            style={[st.pickerChip, active && st.pickerChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[st.pickerChipTxt, active && st.pickerChipTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, refresh } = useOwnProfile();

  const [bio, setBio] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [ageFrom, setAgeFrom] = useState('18');
  const [ageTo, setAgeTo] = useState('');
  const [interestedGender, setInterestedGender] = useState<Gender[]>([]);
  const [religion, setReligion] = useState<Religion | null>(null);
  const [religiousPref, setReligiousPref] = useState<Religion | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session!.user.id;

  // Populate from loaded profile
  useEffect(() => {
    if (!data) return;
    setBio(data.bio ?? '');
    setCity(data.city);
    setAgeFrom(String(data.age_from));
    setAgeTo(data.age_to ? String(data.age_to) : '');
    setInterestedGender(data.interested_gender as Gender[]);
    setReligion(data.religion);
    setReligiousPref((data.religious_preference as Religion | null) ?? null);
    setInterests(data.interests as Interest[]);
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!city || !religion) {
      setError('City and religion are required.');
      return;
    }
    const fromNum = parseInt(ageFrom, 10);
    const toNum = ageTo ? parseInt(ageTo, 10) : null;
    if (isNaN(fromNum) || fromNum < 18) {
      setError('Age from must be 18 or above.');
      return;
    }
    if (toNum !== null && toNum <= fromNum) {
      setError('Age to must be greater than age from.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: err } = await updateDatingProfile(userId, {
        bio: bio.trim() || undefined,
        city,
        age_from: fromNum,
        age_to: toNum,
        interested_gender: interestedGender,
        religion,
        religious_preference: religiousPref,
        interests,
      });
      if (err) throw err;
      await refresh();
      router.back();
    } catch {
      setError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    bio,
    city,
    ageFrom,
    ageTo,
    interestedGender,
    religion,
    religiousPref,
    interests,
    userId,
    refresh,
    router,
  ]);

  const saveButton = (
    <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={[st.saveBtn, saving && st.saveBtnDim]}>{saving ? 'Saving…' : 'Save'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <NavHeader back title="Edit Profile" onBack={() => router.back()} right={saveButton} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={st.flex1}
      >
        <ScrollView
          contentContainerStyle={st.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={st.errorBanner}>
              <Text style={st.errorTxt}>{error}</Text>
            </View>
          )}

          {/* Bio */}
          <SectionLabel label="Bio" />
          <TextInput
            style={[st.input, st.bioInput]}
            placeholder="Tell people a bit about yourself…"
            placeholderTextColor={colors.inkGhost}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={st.charCount}>{bio.length}/500</Text>

          {/* City */}
          <SectionLabel label="City" />
          <PickerRow<City>
            options={CITIES}
            value={city}
            onChange={setCity}
          />

          {/* Age range */}
          <SectionLabel label="Age Range" />
          <View style={st.ageRow}>
            <View style={st.ageField}>
              <Text style={st.ageFieldLabel}>From</Text>
              <TextInput
                style={st.ageInput}
                value={ageFrom}
                onChangeText={setAgeFrom}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.inkGhost}
              />
            </View>
            <Text style={st.ageDash}>–</Text>
            <View style={st.ageField}>
              <Text style={st.ageFieldLabel}>To (optional)</Text>
              <TextInput
                style={st.ageInput}
                value={ageTo}
                onChangeText={setAgeTo}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="—"
                placeholderTextColor={colors.inkGhost}
              />
            </View>
          </View>

          {/* Interested in */}
          <SectionLabel label="Interested In" />
          <MultiPickerRow<Gender>
            options={GENDERS}
            values={interestedGender}
            onChange={setInterestedGender}
          />

          {/* Religion */}
          <SectionLabel label="My Religion" />
          <PickerRow<Religion>
            options={RELIGIONS}
            value={religion}
            onChange={setReligion}
          />

          {/* Religious preference */}
          <SectionLabel label="Partner's Religion (optional)" />
          <View style={st.pickerGrid}>
            {RELIGIOUS_PREFS.map((opt) => {
              const active = religiousPref === opt.value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => setReligiousPref(opt.value)}
                  style={[st.pickerChip, active && st.pickerChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[st.pickerChipTxt, active && st.pickerChipTxtActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Interests */}
          <SectionLabel label="Interests" />
          <MultiPickerRow<Interest>
            options={INTERESTS}
            values={interests}
            onChange={setInterests}
          />

          <View style={st.bottomBtn}>
            <PurpleButton label="Save Changes" onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex1: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  saveBtn: { fontSize: 15, fontWeight: '600', color: colors.purple },
  saveBtnDim: { opacity: 0.4 },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorTxt: { color: '#B91C1C', fontSize: 13, fontWeight: '500' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  bioInput: { minHeight: 100, textAlignVertical: 'top', lineHeight: 22 },
  charCount: { fontSize: 12, color: colors.inkGhost, textAlign: 'right', marginTop: 4 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ageField: { flex: 1 },
  ageFieldLabel: { fontSize: 12, color: colors.inkMid, marginBottom: 6 },
  ageInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  ageDash: { fontSize: 20, color: colors.inkGhost, marginTop: 20 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.divider,
  },
  pickerChipActive: {
    backgroundColor: colors.purplePale,
    borderColor: colors.purple,
  },
  pickerChipTxt: { fontSize: 14, color: colors.inkMid, fontWeight: '500' },
  pickerChipTxtActive: { color: colors.purple },
  bottomBtn: { marginTop: 32 },
});
