import { Stack, Redirect, router } from 'expo-router';
import { Suspense, useEffect } from 'react';
import { useSession } from '@/context/auth';
import {
  useGetApiProfilesMeSuspense,
  useGetApiDatingProfilesMeSuspense,
} from '@/lib/api/generated/profiles/profiles';
import Splash from '@/components/ui/Splash';

function OnboardingGuard() {
  const { data: profile } = useGetApiProfilesMeSuspense();
  const { data: datingProfile } = useGetApiDatingProfilesMeSuspense();

  const needsOnboarding = !profile?.chosenName || (!datingProfile && profile.role !== 'winger');
  const isWinger = profile?.role === 'winger' || datingProfile?.datingStatus === 'winging';

  useEffect(() => {
    if (!needsOnboarding) {
      router.replace((isWinger ? '/(winger-tabs)/friends' : '/(tabs)/discover') as any);
    }
  }, [needsOnboarding, isWinger]);

  if (!needsOnboarding) return <Splash variant="spinner" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function OnboardingLayout() {
  const { session, loading } = useSession();

  if (loading) return <Splash variant="spinner" />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Suspense fallback={<Splash variant="spinner" />}>
      <OnboardingGuard />
    </Suspense>
  );
}
