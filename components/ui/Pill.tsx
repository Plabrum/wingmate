import { View, Text } from '@/lib/tw';
import { cn } from '@/lib/cn';

type Props = {
  label: string;
  active?: boolean;
};

export function Pill({ label, active = true }: Props) {
  return (
    <View
      className={cn(
        'rounded-[20px] px-3 py-1.5 self-start',
        active ? 'bg-purple-pale' : 'bg-muted'
      )}
    >
      <Text className={cn('text-13 font-medium', active ? 'text-purple' : 'text-ink-mid')}>
        {label}
      </Text>
    </View>
  );
}
