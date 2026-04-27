import { Tabs } from 'expo-router';
import React from 'react';

import { BottomTabBar } from '@/components/ui/BottomTabBar';
import { useSession } from '@/context/auth';

export default function WingerTabLayout() {
  const { session } = useSession();

  if (!session) return null;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} role="winger" />}
    >
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="scout" options={{ title: 'Scout' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
