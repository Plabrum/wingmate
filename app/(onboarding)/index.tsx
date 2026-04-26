import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { useAuth } from '@/context/auth';
import {
  useGetApiProfilesMeSuspense,
  useGetApiDatingProfilesMeSuspense,
  patchApiProfilesMe,
  postApiDatingProfiles,
  getGetApiProfilesMeQueryKey,
  getGetApiDatingProfilesMeQueryKey,
} from '@/lib/api/generated/profiles/profiles';
import type { Database } from '@/types/database';
import RoleStep from '@/components/onboarding/RoleStep';
import ProfileStep, { type ProfileFields } from '@/components/onboarding/ProfileStep';
import PhotosStep from '@/components/onboarding/PhotosStep';
import PromptsStep from '@/components/onboarding/PromptsStep';

type Role = Database['public']['Enums']['user_role'];
type Step = 'role' | 'profile' | 'photos' | 'prompts';

function deriveInitialStep(
  profile: { chosenName?: string | null } | null,
  datingProfile: { id: string } | null
): Step {
  if (!profile?.chosenName) return 'role';
  if (!datingProfile) return 'photos';
  return 'prompts';
}

export default function OnboardingScreen() {
  const { userId, session } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useGetApiProfilesMeSuspense();
  const { data: datingProfile } = useGetApiDatingProfilesMeSuspense();

  const [step, setStep] = useState<Step>(() => deriveInitialStep(profile, datingProfile));
  const [selectedRole, setSelectedRole] = useState<Role | null>((profile?.role as Role) ?? null);
  const [dpId, setDpId] = useState<string | null>(datingProfile?.id ?? null);

  function onRolePick(role: Role) {
    setSelectedRole(role);
    setStep('profile');
  }

  async function onProfileComplete(fields: ProfileFields): Promise<string | undefined> {
    const role = selectedRole!;
    try {
      await patchApiProfilesMe({
        chosenName: fields.chosenName.trim(),
        dateOfBirth: fields.dateOfBirth.toISOString().split('T')[0],
        phoneNumber: fields.phoneNumber.trim() || null,
        gender: fields.gender,
        role,
      });
    } catch (e) {
      return e instanceof Error ? e.message : 'Unknown error';
    }

    switch (role) {
      case 'winger': {
        queryClient.invalidateQueries({ queryKey: getGetApiProfilesMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetApiDatingProfilesMeQueryKey() });
        router.replace('/(tabs)/profile' as any);
        return;
      }
      case 'dater': {
        try {
          const dp = await postApiDatingProfiles({
            city: fields.city ?? 'Boston',
            bio: fields.bio.trim() || undefined,
            ageFrom: 18,
            interestedGender: [],
            religion: 'Prefer not to say',
            interests: [],
            datingStatus: 'open',
          });
          setDpId(dp.id);
          setStep('photos');
        } catch (e) {
          return e instanceof Error ? e.message : 'Unknown error';
        }
        return;
      }
    }
  }

  function onPhotosNext() {
    setStep('prompts');
  }

  switch (step) {
    case 'role':
      return <RoleStep onNext={onRolePick} />;

    case 'profile':
      return (
        <ProfileStep
          role={selectedRole!}
          defaultPhoneNumber={session.user.phone ?? ''}
          onNext={onProfileComplete}
        />
      );

    case 'photos':
      return <PhotosStep userId={userId} dpId={dpId} onDpCreated={setDpId} onNext={onPhotosNext} />;

    case 'prompts':
      return (
        <ScreenSuspense>
          <PromptsStep onFinish={() => router.replace('/(tabs)/discover' as any)} />
        </ScreenSuspense>
      );
  }
}
