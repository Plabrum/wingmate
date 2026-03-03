import '../global.css';
import 'react-native-url-polyfill/auto';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useSession } from '@/context/auth';
import { useProfileData } from '@/queries/profiles';
import { queryClient } from '@/lib/queryClient';
import { registerPushToken } from '@/lib/push';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthenticatedNavigator({ userId }: { userId: string }) {
  const {
    data: { profile },
  } = useProfileData(userId);

  // Captured once at mount — Suspense ensures profile is ready before this renders
  const [dest] = useState<string>(() =>
    !profile?.chosen_name
      ? '/(onboarding)'
      : profile.role === 'winger'
        ? '/(tabs)/profile'
        : '/(tabs)/discover'
  );

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
  );
}
