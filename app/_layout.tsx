import '../global.css';
import 'react-native-url-polyfill/auto';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { QueryClientProvider, useSuspenseQuery } from '@tanstack/react-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useSession } from '@/context/auth';
import { getProfileData } from '@/queries/profiles';
import { queryClient } from '@/lib/queryClient';
import { registerPushToken } from '@/lib/push';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthenticatedNavigator({ userId }: { userId: string }) {
  // select derives a stable string — this component only re-renders when dest
  // actually changes (e.g. onboarding → discover), not on every profile refetch.
  const { data: dest } = useSuspenseQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfileData(userId),
    staleTime: 5 * 60_000,
    select: ({ profile, datingProfile }) =>
      !profile?.chosen_name
        ? '/(onboarding)'
        : profile.role === 'winger'
          ? '/(tabs)/profile'
          : !datingProfile
            ? '/(onboarding)'
            : '/(tabs)/discover',
  });

  // Mount-only: check for a pending deep-link invite (external async state)
  useEffect(() => {
    AsyncStorage.getItem('pending_invite').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pending_invite');
      router.replace('/(tabs)/profile/wingpeople/' as any);
    });
  }, [userId]);

  // Mount-only: register push token (external device event)
  useEffect(() => {
    registerPushToken(userId);
  }, [userId]);

  return <Redirect href={dest as any} />;
}

function RootNavigator() {
  const { session, loading } = useSession();

  if (loading) return null;

  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <ScreenSuspense>
      <AuthenticatedNavigator userId={session.user.id} />
    </ScreenSuspense>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
              <Stack.Screen name="invite" options={{ headerShown: false }} />
            </Stack>
            <RootNavigator />
            <Toaster position="bottom-center" richColors />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
