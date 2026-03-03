import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { updateDatingProfile, useProfileData } from '@/queries/profiles';
import type { OwnDatingProfile } from '@/queries/profiles';
import type { Database } from '@/types/database';
import { CITIES, GENDERS, RELIGIONS, INTERESTS } from '@/constants/enums';
import { View, Text, TextInput, ScrollView, SafeAreaView, Pressable } from '@/lib/tw';
import { cn } from '@/lib/cn';

import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { NavHeader } from '@/components/ui/NavHeader';
import { PurpleButton } from '@/components/ui/PurpleButton';

type Gender = Database['public']['Enums']['gender'];
type Religion = Database['public']['Enums']['religion'];
type City = Database['public']['Enums']['city'];
type Interest = Database['public']['Enums']['interest'];

type FormValues = {
  bio: string;
  city: City | null;
  ageFrom: string;
  ageTo: string;
  interestedGender: Gender[];
  religion: Religion | null;
  religiousPref: Religion | null;
  interests: Interest[];
};

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
  return (
    <Text className="text-[12px] font-bold text-ink-dim uppercase tracking-[0.6px] mt-5 mb-2.5">
      {label}
    </Text>
  );
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
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className={cn(
              'rounded-[20px] px-3.5 py-2 bg-white border-[1.5px] border-divider',
              active && 'bg-purple-pale border-purple'
            )}
          >
            <Text className={cn('text-[14px] text-ink-mid font-medium', active && 'text-purple')}>
              {getLabel ? getLabel(opt) : opt}
            </Text>
          </Pressable>
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
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => toggle(opt)}
            className={cn(
              'rounded-[20px] px-3.5 py-2 bg-white border-[1.5px] border-divider',
              active && 'bg-purple-pale border-purple'
            )}
          >
            <Text className={cn('text-[14px] text-ink-mid font-medium', active && 'text-purple')}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function EditProfileForm({
  data,
  refresh,
  userId,
  router,
}: {
  data: OwnDatingProfile;
  refresh: () => unknown;
  userId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      bio: data.bio ?? '',
      city: data.city as City | null,
      ageFrom: String(data.age_from),
      ageTo: data.age_to ? String(data.age_to) : '',
      interestedGender: data.interested_gender as Gender[],
      religion: data.religion as Religion | null,
      religiousPref: (data.religious_preference as Religion | null) ?? null,
      interests: data.interests as Interest[],
    },
  });

  const handleSave = handleSubmit(async (values) => {
    if (!values.city || !values.religion) {
      toast.error('City and religion are required.');
      return;
    }
    const fromNum = parseInt(values.ageFrom, 10);
    const toNum = values.ageTo ? parseInt(values.ageTo, 10) : null;
    if (isNaN(fromNum) || fromNum < 18) {
      toast.error('Age from must be 18 or above.');
      return;
    }
    if (toNum !== null && toNum <= fromNum) {
      toast.error('Age to must be greater than age from.');
      return;
    }

    const { error } = await updateDatingProfile(userId, {
      bio: values.bio.trim() || undefined,
      city: values.city,
      age_from: fromNum,
      age_to: toNum,
      interested_gender: values.interestedGender,
      religion: values.religion,
      religious_preference: values.religiousPref,
      interests: values.interests,
    });

    if (error) {
      toast.error('Could not save changes. Please try again.');
      return;
    }
    refresh();
    router.back();
  });

  const bioValue = watch('bio');

  const saveButton = (
    <Pressable
      onPress={handleSave}
      disabled={isSubmitting}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text className={cn('text-[15px] font-semibold text-purple', isSubmitting && 'opacity-40')}>
        {isSubmitting ? 'Saving…' : 'Save'}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <NavHeader back title="Edit Profile" onBack={() => router.back()} right={saveButton} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerClassName="p-5 pb-12"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bio */}
          <SectionLabel label="Bio" />
          <Controller
            control={control}
            name="bio"
            render={({ field }) => (
              <TextInput
                className="bg-white rounded-[12px] px-3.5 py-3 text-[15px] text-ink min-h-[100px]"
                style={{ textAlignVertical: 'top', lineHeight: 22 }}
                placeholder="Tell people a bit about yourself…"
                placeholderTextColor={colors.inkGhost}
                value={field.value}
                onChangeText={field.onChange}
                multiline
                maxLength={500}
              />
            )}
          />
          <Text className="text-[12px] text-ink-ghost text-right mt-1">{bioValue.length}/500</Text>

          {/* City */}
          <SectionLabel label="City" />
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <PickerRow<City> options={CITIES} value={field.value} onChange={field.onChange} />
            )}
          />

          {/* Age range */}
          <SectionLabel label="Age Range" />
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-[12px] text-ink-mid mb-1.5">From</Text>
              <Controller
                control={control}
                name="ageFrom"
                render={({ field }) => (
                  <TextInput
                    className="bg-white rounded-[12px] px-3.5 py-3 text-[16px] text-ink text-center"
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholderTextColor={colors.inkGhost}
                  />
                )}
              />
            </View>
            <Text className="text-[20px] text-ink-ghost mt-5">–</Text>
            <View className="flex-1">
              <Text className="text-[12px] text-ink-mid mb-1.5">To (optional)</Text>
              <Controller
                control={control}
                name="ageTo"
                render={({ field }) => (
                  <TextInput
                    className="bg-white rounded-[12px] px-3.5 py-3 text-[16px] text-ink text-center"
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="—"
                    placeholderTextColor={colors.inkGhost}
                  />
                )}
              />
            </View>
          </View>

          {/* Interested in */}
          <SectionLabel label="Interested In" />
          <Controller
            control={control}
            name="interestedGender"
            render={({ field }) => (
              <MultiPickerRow<Gender>
                options={GENDERS}
                values={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {/* Religion */}
          <SectionLabel label="My Religion" />
          <Controller
            control={control}
            name="religion"
            render={({ field }) => (
              <PickerRow<Religion>
                options={RELIGIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {/* Religious preference */}
          <SectionLabel label="Partner's Religion (optional)" />
          <Controller
            control={control}
            name="religiousPref"
            render={({ field }) => (
              <View className="flex-row flex-wrap gap-2">
                {RELIGIOUS_PREFS.map((opt) => {
                  const active = field.value === opt.value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      onPress={() => field.onChange(opt.value)}
                      className={cn(
                        'rounded-[20px] px-3.5 py-2 bg-white border-[1.5px] border-divider',
                        active && 'bg-purple-pale border-purple'
                      )}
                    >
                      <Text
                        className={cn(
                          'text-[14px] text-ink-mid font-medium',
                          active && 'text-purple'
                        )}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />

          {/* Interests */}
          <SectionLabel label="Interests" />
          <Controller
            control={control}
            name="interests"
            render={({ field }) => (
              <MultiPickerRow<Interest>
                options={INTERESTS}
                values={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <View className="mt-8">
            <PurpleButton label="Save Changes" onPress={handleSave} loading={isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

function EditProfileScreenInner() {
  const router = useRouter();
  const { userId } = useAuth();
  const {
    data: { datingProfile },
    refetch,
  } = useProfileData(userId);

  if (!datingProfile) {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
        <NavHeader back title="Edit Profile" onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return <EditProfileForm data={datingProfile} refresh={refetch} userId={userId} router={router} />;
}

export default function EditProfileScreen() {
  return (
    <ScreenSuspense>
      <EditProfileScreenInner />
    </ScreenSuspense>
  );
}
