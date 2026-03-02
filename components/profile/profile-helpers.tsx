import { View, Text } from '@/lib/tw';
import type { OwnDatingProfile } from '@/queries/profiles';

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export interface OptimisticHandlers {
  onOptimistic: (patch: Partial<OwnDatingProfile>) => void;
  onRollback: (patch: Partial<OwnDatingProfile>) => void;
  onError: (msg: string) => void;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="mx-5 mt-[10px] bg-[#FEE2E2] rounded-[10px] p-3">
      <Text className="text-[#B91C1C] text-13 font-medium">{message}</Text>
    </View>
  );
}
