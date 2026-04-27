import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import Svg, { Path } from 'react-native-svg';

import {
  useGetApiDatingProfilesMeSuspense,
  patchApiDatingProfilesMe,
  getGetApiDatingProfilesMeQueryKey,
} from '@/lib/api/generated/profiles/profiles';
import type { OwnDatingProfileResponse } from '@/lib/api/generated/model';
import type { Database } from '@/types/database';
import { CITIES, GENDERS, RELIGIONS, INTERESTS } from '@/constants/enums';
import { View, Text, ScrollView, SafeAreaView, Pressable } from '@/lib/tw';
import { cn } from '@/lib/cn';
import { createForm, RootError, SubmitButton, useFormSubmit } from '@/lib/forms';

import ScreenSuspense from '@/components/ui/ScreenSuspense';

const INK = '#1F1B16';
const INK3 = '#8B8170';
const LEAF = '#5A8C3A';

function BackIcon({ color = INK }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EditHeader({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) {
  return (
    <View
      className="flex-row items-center"
      style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 4 }}
    >
      <Pressable onPress={onBack} hitSlop={12} style={{ padding: 8, marginLeft: -4 }}>
        <BackIcon />
      </Pressable>
      <Text
        className="font-serif"
        style={{ fontSize: 26, color: INK, letterSpacing: -0.4, flex: 1 }}
      >
        Edit profile
      </Text>
      {right}
    </View>
  );
}

type Religion = Database['public']['Enums']['religion'];

const RELIGIOUS_PREFS: { value: Religion | null; label: string }[] = [
  { value: null, label: 'No preference' },
  { value: 'Muslim', label: 'Must be Muslim' },
  { value: 'Christian', label: 'Must be Christian' },
  { value: 'Jewish', label: 'Must be Jewish' },
  { value: 'Hindu', label: 'Must be Hindu' },
  { value: 'Buddhist', label: 'Must be Buddhist' },
  { value: 'Sikh', label: 'Must be Sikh' },
];

const editSchema = z
  .object({
    bio: z.string().max(500),
    city: z.enum(CITIES),
    ageFrom: z
      .string()
      .regex(/^\d+$/, 'Enter a valid age')
      .refine((v) => parseInt(v, 10) >= 18, 'Must be 18 or above'),
    ageTo: z.union([z.literal(''), z.string().regex(/^\d+$/, 'Enter a valid age')]),
    interestedGender: z.array(z.enum(GENDERS)),
    religion: z.enum(RELIGIONS),
    religiousPref: z.enum(RELIGIONS).nullable(),
    interests: z.array(z.enum(INTERESTS)),
  })
  .superRefine((data, ctx) => {
    if (data.ageTo) {
      const from = parseInt(data.ageFrom, 10);
      const to = parseInt(data.ageTo, 10);
      if (!isNaN(from) && to <= from) {
        ctx.addIssue({
          code: 'custom',
          path: ['ageTo'],
          message: 'Must be greater than From',
        });
      }
    }
  });

const editForm = createForm(editSchema);

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 10.5,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: INK3,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {label}
    </Text>
  );
}

function HeaderSave() {
  const { submit, isValid, isSubmitting } = useFormSubmit();
  const disabled = !isValid || isSubmitting;
  return (
    <Pressable
      onPress={submit}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ paddingHorizontal: 8 }}
    >
      <Text
        className={cn(disabled && 'opacity-40')}
        style={{ fontSize: 14, fontWeight: '600', color: LEAF }}
      >
        {isSubmitting ? 'Saving…' : 'Save'}
      </Text>
    </Pressable>
  );
}

function EditProfileForm({
  data,
  router,
}: {
  data: NonNullable<OwnDatingProfileResponse>;
  router: ReturnType<typeof useRouter>;
}) {
  const queryClient = useQueryClient();

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'bottom']}
      style={{ backgroundColor: '#F5F1E8' }}
    >
      <editForm.Form
        defaultValues={{
          bio: data.bio ?? '',
          city: data.city ?? undefined,
          ageFrom: String(data.ageFrom ?? 18),
          ageTo: data.ageTo ? String(data.ageTo) : '',
          interestedGender: data.interestedGender ?? [],
          religion: data.religion ?? undefined,
          religiousPref: (data.religiousPreference as Religion | null) ?? null,
          interests: data.interests ?? [],
        }}
        onSubmit={async (values) => {
          const fromNum = parseInt(values.ageFrom, 10);
          const toNum = values.ageTo ? parseInt(values.ageTo, 10) : null;
          try {
            await patchApiDatingProfilesMe({
              bio: values.bio.trim() || undefined,
              city: values.city,
              ageFrom: fromNum,
              ageTo: toNum,
              interestedGender: values.interestedGender,
              religion: values.religion,
              religiousPreference: values.religiousPref,
              interests: values.interests,
            });
          } catch {
            throw new Error('Could not save changes. Please try again.');
          }
          queryClient.invalidateQueries({ queryKey: getGetApiDatingProfilesMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['pool'] });
          queryClient.invalidateQueries({ queryKey: ['likes-you-count'] });
          router.back();
        }}
      >
        <EditHeader onBack={() => router.back()} right={<HeaderSave />} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerClassName="p-5 pb-12"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SectionLabel label="Bio" />
            <editForm.TextField
              name="bio"
              placeholder="Tell people a bit about yourself…"
              multiline
              maxLength={500}
              showCount
            />

            <SectionLabel label="City" />
            <editForm.ChoiceField name="city" options={CITIES} />

            <SectionLabel label="Age Range" />
            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <Text className="text-xs text-fg-muted mb-1.5">From</Text>
                <editForm.TextField name="ageFrom" keyboardType="number-pad" maxLength={2} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-fg-muted mb-1.5">To (optional)</Text>
                <editForm.TextField
                  name="ageTo"
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="—"
                />
              </View>
            </View>

            <SectionLabel label="Interested In" />
            <editForm.ChoiceField name="interestedGender" options={GENDERS} multi />

            <SectionLabel label="My Religion" />
            <editForm.ChoiceField name="religion" options={RELIGIONS} />

            <SectionLabel label="Partner's Religion (optional)" />
            <editForm.SelectSheetField
              name="religiousPref"
              options={RELIGIOUS_PREFS}
              placeholder="No preference"
            />

            <SectionLabel label="Interests" />
            <editForm.ChoiceField name="interests" options={INTERESTS} multi />

            <View className="mt-8">
              <SubmitButton label="Save Changes" />
            </View>
            <RootError />
          </ScrollView>
        </KeyboardAvoidingView>
      </editForm.Form>
    </SafeAreaView>
  );
}

function EditProfileScreenInner() {
  const router = useRouter();
  const { data: datingProfile } = useGetApiDatingProfilesMeSuspense();

  if (!datingProfile) {
    return (
      <SafeAreaView
        className="flex-1"
        edges={['top', 'bottom']}
        style={{ backgroundColor: '#F5F1E8' }}
      >
        <EditHeader onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return <EditProfileForm data={datingProfile} router={router} />;
}

export default function EditProfileScreen() {
  return (
    <ScreenSuspense>
      <EditProfileScreenInner />
    </ScreenSuspense>
  );
}
