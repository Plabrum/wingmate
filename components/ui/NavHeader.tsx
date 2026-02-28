import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <View style={styles.row}>
      {back ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.side}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.purple} />
        </TouchableOpacity>
      ) : (
        <View style={styles.side} />
      )}
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {sub != null && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <View style={[styles.side, styles.rightSide]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.white,
  },
  side: {
    width: 40,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
  },
  sub: {
    fontSize: 12,
    color: colors.inkMid,
    marginTop: 1,
  },
});
