import { Tabs, Redirect, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/context/auth';
import { PearMark } from '@/components/ui/PearMark';
import {
  getApiProfilesMe,
  getGetApiProfilesMeQueryKey,
  getApiDatingProfilesMe,
  getGetApiDatingProfilesMeQueryKey,
} from '@/lib/api/generated/profiles/profiles';
import { registerPushToken } from '@/lib/push';
import Splash from '@/components/ui/Splash';

const ACTIVE = '#5A8C3A';
const INACTIVE = '#8b8170';

const tabBarBackground =
  Platform.OS === 'ios'
    ? () => (
        <BlurView
          intensity={40}
          tint="light"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(251,248,241,0.7)' }]}
        />
      )
    : undefined;

const sharedScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: ACTIVE,
  tabBarInactiveTintColor: INACTIVE,
  tabBarStyle: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#fbf8f1',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(31,27,22,0.10)',
  },
  tabBarBackground,
  tabBarItemStyle: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  tabBarLabelStyle: {
    fontFamily: 'Geist',
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
} as const;

function WingerTabsGuard({ userId }: { userId: string }) {
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: getGetApiProfilesMeQueryKey(),
    queryFn: getApiProfilesMe,
  });
  const { data: datingProfile, isPending: datingPending } = useQuery({
    queryKey: getGetApiDatingProfilesMeQueryKey(),
    queryFn: getApiDatingProfilesMe,
  });

  const loading = profilePending || datingPending;
  const isWinger = profile?.role === 'winger' || datingProfile?.datingStatus === 'winging';

  useEffect(() => {
    registerPushToken(userId);
  }, [userId]);

  useEffect(() => {
    AsyncStorage.getItem('pending_invite').then((val) => {
      if (!val) return;
      AsyncStorage.removeItem('pending_invite');
      router.replace('/(winger-tabs)/friends' as any);
    });
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    if (!isWinger) router.replace('/(tabs)/discover' as any);
  }, [loading, isWinger]);

  if (loading || !isWinger) return <Splash />;

  return (
    <Tabs screenOptions={sharedScreenOptions}>
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scout"
        options={{
          title: 'Scout',
          tabBarIcon: ({ color }) => <Ionicons name="albums-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Ionicons name="sparkles" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <PearMark size={22} color={color} variant={focused ? 'flat' : 'outline'} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function WingerTabLayout() {
  const { session, loading } = useSession();

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return <WingerTabsGuard userId={session.user.id} />;
}
