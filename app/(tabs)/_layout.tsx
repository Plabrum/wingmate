import { Tabs } from 'expo-router';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { BottomTabBar } from '@/components/ui/BottomTabBar';
import { useSession } from '@/context/auth';
import {
  getApiDatingProfilesMe,
  getApiProfilesMe,
  getGetApiDatingProfilesMeQueryKey,
  getGetApiProfilesMeQueryKey,
} from '@/lib/api/generated/profiles/profiles';

export default function TabLayout() {
  const { session } = useSession();

  const { data: profile } = useQuery({
    queryKey: getGetApiProfilesMeQueryKey(),
    queryFn: ({ signal }) => getApiProfilesMe({ signal }),
    enabled: !!session,
  });
  const { data: datingProfile } = useQuery({
    queryKey: getGetApiDatingProfilesMeQueryKey(),
    queryFn: ({ signal }) => getApiDatingProfilesMe({ signal }),
    enabled: !!session,
  });

  if (!session) return null;

  const isWinger = profile?.role === 'winger' || datingProfile?.datingStatus === 'winging';

  const daterHref = isWinger ? null : undefined;
  const wingerHref = isWinger ? undefined : null;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} role={isWinger ? 'winger' : 'dater'} />}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', href: daterHref }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', href: daterHref }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', href: daterHref }} />
      <Tabs.Screen name="wingpeople" options={{ title: 'Wingpeople', href: wingerHref }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
