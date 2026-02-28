import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  label: string;
  active?: boolean;
};

export function Pill({ label, active = true }: Props) {
  return (
    <View style={[styles.pill, active ? styles.active : styles.inactive]}>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  active: {
    backgroundColor: colors.purplePale,
  },
  inactive: {
    backgroundColor: colors.muted,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeText: {
    color: colors.purple,
  },
  inactiveText: {
    color: colors.inkMid,
  },
});
