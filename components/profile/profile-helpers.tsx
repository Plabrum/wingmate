import { StyleSheet, Text, View } from 'react-native';
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
    <View style={st.wrap}>
      <Text style={st.text}>{message}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
  },
  text: { color: '#B91C1C', fontSize: 13, fontWeight: '500' },
});
