import { View, Text } from '@/lib/tw';
import { colors } from '@/constants/theme';

type Props = {
  initials: string;
  bg?: string;
  size?: number;
};

export function FaceAvatar({ initials, bg = colors.purpleSoft, size = 40 }: Props) {
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }}
    >
      <Text className="text-purple font-semibold" style={{ fontSize: Math.round(size * 0.36) }}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}
