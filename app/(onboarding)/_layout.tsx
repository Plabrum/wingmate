import { Stack, Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/context/auth';
import {
  getApiProfilesMe,
  getGetApiProfilesMeQueryKey,
  getApiDatingProfilesMe,
  getGetApiDatingProfilesMeQueryKey,
} from '@/lib/api/generated/profiles/profiles';
import Splash from '@/components/ui/Splash';

function OnboardingGuard() {
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: getGetApiProfilesMeQueryKey(),
    queryFn: getApiProfilesMe,
  });
  const { data: datingProfile, isPending: datingPending } = useQuery({
    queryKey: getGetApiDatingProfilesMeQueryKey(),
    queryFn: getApiDatingProfilesMe,
  });

  const loading = profilePending || datingPending;
  const needsOnboarding = !profile?.chosenName || (!datingProfile && profile?.role !== 'winger');
  const isWinger = profile?.role === 'winger' || datingProfile?.datingStatus === 'winging';

  useEffect(() => {
    if (loading) return;
    if (!needsOnboarding) {
      router.replace((isWinger ? '/(winger-tabs)/friends' : '/(tabs)/discover') as any);
    }
  }, [loading, needsOnboarding, isWinger]);

  if (loading || !needsOnboarding) return <Splash />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function OnboardingLayout() {
  const { session, loading } = useSession();

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return <OnboardingGuard />;
}
