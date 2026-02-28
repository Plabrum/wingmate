import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  initials: string;
  bg?: string;
  size?: number;
};

export function FaceAvatar({ initials, bg = colors.purpleSoft, size = 40 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.36) }]}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.purple,
    fontWeight: '600',
  },
});
