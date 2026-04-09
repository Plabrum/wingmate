import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/context/auth';
import { getProfileData } from '@/queries/profiles';
import { View, Text, Pressable } from '@/lib/tw';

// ── Winger tab bar ────────────────────────────────────────────────────────────

const WINGER_TABS = [
  {
    label: 'Profile',
    icon: 'person.fill' as const,
    href: '/(tabs)/profile' as const,
    activeWhen: (p: string) => !p.includes('wingpeople') && !p.includes('wingswipe'),
  },
  {
    label: 'Add to Profile',
    icon: 'plus.circle.fill' as const,
    href: '/(tabs)/profile/wingpeople' as const,
    activeWhen: (p: string) => p.includes('wingpeople') && !p.includes('wingswipe'),
  },
  {
    label: 'Swipe',
    icon: 'arrow.left.arrow.right' as const,
    href: '/(tabs)/profile/wingpeople' as const,
    activeWhen: (p: string) => p.includes('wingswipe'),
  },
];

function WingerTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {WINGER_TABS.map((tab) => {
        const active = tab.activeWhen(pathname);
        return (
          <Pressable
            key={tab.label}
            className="flex-1 items-center justify-center pt-2 pb-1 gap-[3px]"
            onPress={() => router.push(tab.href)}
          >
            <IconSymbol
              name={tab.icon}
              size={26}
              color={active ? colors.purple : colors.inkGhost}
            />
            <Text
              className="text-[10px]"
              style={{
                color: active ? colors.purple : colors.inkGhost,
                fontWeight: active ? '600' : '400',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});

// ── Tab layout ────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session } = useSession();
  const userId = session?.user?.id ?? '';

  const { data: profileData } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfileData(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const isWinging =
    profileData?.profile?.role === 'winger' ||
    profileData?.datingProfile?.dating_status === 'winging';

  if (!session) return null;

  return (
    <Tabs
      tabBar={isWinging ? () => <WingerTabBar /> : undefined}
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
          href: isWinging ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.crop.square.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          href: isWinging ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: isWinging ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.fill" color={color} />,
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
