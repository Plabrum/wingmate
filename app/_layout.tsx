import '../global.css';
import 'react-native-url-polyfill/auto';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toaster } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useSession } from '@/context/auth';
import { useProfileData } from '@/hooks/use-profile';
import { queryClient } from '@/lib/queryClient';
import { registerPushToken } from '@/lib/push';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

export const unstable_settings = {
  anchor: '(dater-tabs)',
};

function AuthenticatedNavigator({ userId }: { userId: string }) {
  const {
    data: { profile, datingProfile },
  } = useProfileData(userId);

  type UserState = 'needs-onboarding' | 'winger' | 'dater';
  const state: UserState =
    !profile?.chosen_name || (!datingProfile && profile.role !== 'winger')
      ? 'needs-onboarding'
      : profile.role === 'winger' || datingProfile?.dating_status === 'winging'
        ? 'winger'
        : 'dater';

  let dest: string;
  switch (state) {
    case 'needs-onboarding':
      dest = '/(onboarding)';
      break;
    case 'winger':
      dest = '/(winger)';
      break;
    case 'dater':
      dest = '/(dater-tabs)/discover';
      break;
  }

  // Mount-only: check for a pending deep-link invite (external async state)
  useEffect(() => {
    AsyncStorage.getItem('pending_invite').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pending_invite');
      const wingpeoplePath =
        dest === '/(winger)' ? '/(winger)/wingpeople/' : '/(dater-tabs)/profile/wingpeople/';
      router.replace(wingpeoplePath as any);
    });
  }, [userId, dest]);

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
              <Stack.Screen name="(dater-tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(winger)" options={{ headerShown: false }} />
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
