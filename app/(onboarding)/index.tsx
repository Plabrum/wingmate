import { useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { useAuth } from '@/context/auth';
import {
  updateBaseProfile,
  createDatingProfile,
  useProfileData,
  invalidateProfile,
} from '@/hooks/use-profile';
import type { Database } from '@/types/database';
import RoleStep from '@/components/onboarding/RoleStep';
import ProfileStep, { type ProfileFields } from '@/components/onboarding/ProfileStep';
import PhotosStep from '@/components/onboarding/PhotosStep';
import PromptsStep from '@/components/onboarding/PromptsStep';

type Role = Database['public']['Enums']['user_role'];
type Step = 'role' | 'profile' | 'photos' | 'prompts';

function deriveInitialStep(
  profile: { chosen_name?: string | null } | null,
  datingProfile: { id: string } | null
): Step {
  if (!profile?.chosen_name) return 'role';
  if (!datingProfile) return 'photos';
  return 'prompts';
}

export default function OnboardingScreen() {
  const { userId, session } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: { profile, datingProfile },
  } = useProfileData(userId);

  const [step, setStep] = useState<Step>(() => deriveInitialStep(profile, datingProfile));
  const [selectedRole, setSelectedRole] = useState<Role | null>((profile?.role as Role) ?? null);
  const [dpId, setDpId] = useState<string | null>(datingProfile?.id ?? null);

  function onRolePick(role: Role) {
    setSelectedRole(role);
    setStep('profile');
  }

  async function onProfileComplete(fields: ProfileFields): Promise<string | undefined> {
    const role = selectedRole!;
    const { error: updateError } = await updateBaseProfile(userId, {
      chosen_name: fields.chosenName.trim(),
      date_of_birth: fields.dateOfBirth.toISOString().split('T')[0],
      phone_number: fields.phoneNumber.trim() || null,
      gender: fields.gender,
      role,
    });
    if (updateError) return updateError.message;

    switch (role) {
      case 'winger': {
        invalidateProfile(queryClient);
        router.replace('/(tabs)/profile' as any);
        return;
      }
      case 'dater': {
        const { data: dp, error: dpError } = await createDatingProfile({
          user_id: userId,
          city: fields.city ?? 'Boston',
          bio: fields.bio.trim() || undefined,
          age_from: 18,
          interested_gender: [],
          religion: 'Prefer not to say',
          interests: [],
          dating_status: 'open',
        });
        if (dpError) return dpError.message;
        setDpId(dp!.id);
        setStep('photos');
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
