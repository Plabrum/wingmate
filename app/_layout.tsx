import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth';
import { ProfileProvider, useProfile } from '@/context/profile';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const { profile, loadingProfile } = useProfile();

  // After successful login + profile load, check for a pending deep-link invite
  useEffect(() => {
    if (!session || loadingProfile) return;
    AsyncStorage.getItem('pending_invite').then((val) => {
      if (val) {
        AsyncStorage.removeItem('pending_invite');
         
        router.replace('/(tabs)/profile/wingpeople/' as any);
      }
    });
  }, [session, loadingProfile]);

  if (loading) return null;

  function getRedirect(): string {
    if (!session) return '/(auth)/login';
    if (!profile?.chosen_name) return '/(onboarding)/role';
    if (profile.role === 'winger') return '/(tabs)/profile';
    return '/(tabs)/discover';
  }

  if (session && loadingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

   
  const redirect = getRedirect() as any;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="invite" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <Redirect href={redirect} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <RootNavigator />
      </ProfileProvider>
    </AuthProvider>
  );
}
