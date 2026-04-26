import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

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
import { NavHeader } from '@/components/ui/NavHeader';

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
    <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mt-5 mb-2.5">
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
    >
      <Text className={cn('text-sm font-semibold text-accent', disabled && 'opacity-40')}>
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
    <SafeAreaView className="flex-1 bg-page" edges={['top', 'bottom']}>
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
        <NavHeader back title="Edit Profile" onBack={() => router.back()} right={<HeaderSave />} />

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
      <SafeAreaView className="flex-1 bg-page" edges={['top', 'bottom']}>
        <NavHeader back title="Edit Profile" onBack={() => router.back()} />
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
