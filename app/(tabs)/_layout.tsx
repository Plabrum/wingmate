import { Tabs } from 'expo-router';
import React from 'react';

import { BottomTabBar } from '@/components/ui/BottomTabBar';
import { useSession } from '@/context/auth';

export default function TabLayout() {
  const { session } = useSession();

  if (!session) return null;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} role="dater" />}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
