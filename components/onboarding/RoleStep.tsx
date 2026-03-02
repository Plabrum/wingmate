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
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 px-6 pt-12 pb-10">
        <Text className="font-serif text-[28px] font-semibold text-ink leading-9 mb-10">
          How do you want to use Orbit?
        </Text>

        <View className="flex-1 gap-4">
          {CARDS.map(({ role, title, subtitle }) => (
            <Pressable
              key={role}
              className={[
                'bg-white rounded-2xl border-2 p-5',
                selected === role ? 'border-purple bg-purple-pale' : 'border-divider',
              ].join(' ')}
              onPress={() => setSelected(role)}
            >
              <Text className="text-[17px] font-semibold text-ink mb-1.5">{title}</Text>
              <Text className="text-sm text-ink-mid leading-5">{subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          className={[
            'mt-6 bg-purple rounded-[14px] py-4 items-center',
            !selected ? 'opacity-40' : '',
          ].join(' ')}
          onPress={() => selected && onNext(selected)}
          disabled={!selected}
        >
          <Text className="text-white text-[17px] font-semibold">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
