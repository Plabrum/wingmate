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
        'rounded-2xl px-3 py-1.5 self-start',
        active ? 'bg-accent-muted' : 'bg-surface'
      )}
    >
      <Text className={cn('text-sm font-medium', active ? 'text-accent' : 'text-fg-muted')}>
        {label}
      </Text>
    </View>
  );
}
