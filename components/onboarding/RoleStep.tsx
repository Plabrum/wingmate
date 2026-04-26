import { useState } from 'react';
import { View, Text, Pressable, SafeAreaView } from '@/lib/tw';
import type { Database } from '@/types/database';

type Role = Database['public']['Enums']['user_role'];

const CARDS: { role: Role; title: string; subtitle: string }[] = [
  {
    role: 'dater',
    title: 'Looking for connections',
    subtitle: 'Browse profiles and go on dates',
  },
  {
    role: 'winger',
    title: 'Here to support friends',
    subtitle: 'Swipe and suggest matches for the people you care about',
  },
];

type Props = { onNext: (role: Role) => void };

export default function RoleStep({ onNext }: Props) {
  const [selected, setSelected] = useState<Role | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-6 pt-12 pb-10">
        <Text className="font-serif text-3xl font-semibold text-fg leading-9 mb-10">
          How do you want to use Pear?
        </Text>

        <View className="flex-1 gap-4">
          {CARDS.map(({ role, title, subtitle }) => (
            <Pressable
              key={role}
              className={[
                'bg-white rounded-2xl border-2 p-5',
                selected === role ? 'border-accent bg-accent-muted' : 'border-separator',
              ].join(' ')}
              onPress={() => setSelected(role)}
            >
              <Text className="text-base font-semibold text-fg mb-1.5">{title}</Text>
              <Text className="text-sm text-fg-muted leading-5">{subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          className={[
            'mt-6 bg-accent rounded-[14px] py-4 items-center',
            !selected ? 'opacity-40' : '',
          ].join(' ')}
          onPress={() => selected && onNext(selected)}
          disabled={!selected}
        >
          <Text className="text-white text-base font-semibold">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
