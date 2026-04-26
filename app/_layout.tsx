import '../global.css';
import 'react-native-url-polyfill/auto';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useSession } from '@/context/auth';
import {
  useGetApiProfilesMeSuspense,
  useGetApiDatingProfilesMeSuspense,
} from '@/lib/api/generated/profiles/profiles';
import { queryClient } from '@/lib/queryClient';
import { registerPushToken } from '@/lib/push';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthenticatedNavigator({ userId }: { userId: string }) {
  const { data: profile } = useGetApiProfilesMeSuspense();
  const { data: datingProfile } = useGetApiDatingProfilesMeSuspense();

  const needsOnboarding = !profile?.chosenName || (!datingProfile && profile.role !== 'winger');
  const isWinger = profile?.role === 'winger' || datingProfile?.datingStatus === 'winging';

  const dest = needsOnboarding
    ? '/(onboarding)'
    : isWinger
      ? '/(tabs)/profile'
      : '/(tabs)/discover';

  // Mount-only: check for a pending deep-link invite (external async state)
  useEffect(() => {
    AsyncStorage.getItem('pending_invite').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pending_invite');
      const wingpeoplePath = isWinger ? '/(tabs)/wingpeople/' : '/(tabs)/profile/wingpeople/';
      router.replace(wingpeoplePath as any);
    });
  }, [userId, isWinger]);

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
