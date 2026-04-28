import '../global.css';
import 'react-native-url-polyfill/auto';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, Redirect, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';

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
import Splash from '@/components/ui/Splash';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthenticatedNavigator({ userId }: { userId: string }) {
  const { data: profile } = useGetApiProfilesMeSuspense();
  const { data: datingProfile } = useGetApiDatingProfilesMeSuspense();
  const segments = useSegments();

  const needsOnboarding = !profile?.chosenName || (!datingProfile && profile.role !== 'winger');
  const isWinger = profile?.role === 'winger' || datingProfile?.datingStatus === 'winging';

  const expectedShell = needsOnboarding ? '(onboarding)' : isWinger ? '(winger-tabs)' : '(tabs)';
  const inCorrectShell = segments[0] === expectedShell;

  const dest = needsOnboarding
    ? '/(onboarding)'
    : isWinger
      ? '/(winger-tabs)/friends'
      : '/(tabs)/discover';

  // Mount-only: check for a pending deep-link invite (external async state)
  useEffect(() => {
    AsyncStorage.getItem('pending_invite').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pending_invite');
      const wingpeoplePath = isWinger ? '/(winger-tabs)/friends' : '/(tabs)/profile/wingpeople/';
      router.replace(wingpeoplePath as any);
    });
  }, [userId, isWinger]);

  // Mount-only: register push token (external device event)
  useEffect(() => {
    registerPushToken(userId);
  }, [userId]);

  if (inCorrectShell) return null;
  return (
    <>
      <Splash />
      <Redirect href={dest as any} />
    </>
  );
}

function RootNavigator() {
  const { session, loading } = useSession();

  if (loading) return <Splash />;

  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <ScreenSuspense fallback={<Splash />}>
      <AuthenticatedNavigator userId={session.user.id} />
    </ScreenSuspense>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    DMSerifDisplay: DMSerifDisplay_400Regular,
    Geist: Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(winger-tabs)" options={{ headerShown: false }} />
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
