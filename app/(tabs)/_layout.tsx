import { Tabs } from 'expo-router';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/context/auth';
import {
  getApiDatingProfilesMe,
  getApiProfilesMe,
  getGetApiDatingProfilesMeQueryKey,
  getGetApiProfilesMeQueryKey,
} from '@/lib/api/generated/profiles/profiles';

export default function TabLayout() {
  const colorScheme = useColorScheme();
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
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          href: daterHref,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.crop.square.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          href: daterHref,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: daterHref,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wingpeople"
        options={{
          title: 'Wingpeople',
          href: wingerHref,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
