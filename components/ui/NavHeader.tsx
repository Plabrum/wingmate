import { StyleSheet } from 'react-native';
import { View, Text, Pressable } from '@/lib/tw';
import { colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type Props = {
  back: boolean;
  onBack: () => void;
  title: string;
  sub?: string;
  right?: React.ReactNode;
};

export function NavHeader({ back, onBack, title, sub, right }: Props) {
  return (
    <View
      className="flex-row items-center px-4 py-3 bg-white"
      style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }}
    >
      {back ? (
        <Pressable
          onPress={onBack}
          className="w-10"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.purple} />
        </Pressable>
      ) : (
        <View className="w-10" />
      )}
      <View className="flex-1 items-center">
        <Text className="text-17 font-semibold text-ink">{title}</Text>
        {sub != null && <Text className="text-12 text-ink-mid mt-px">{sub}</Text>}
      </View>
      <View className="w-10 items-end">{right ?? null}</View>
    </View>
  );
}
