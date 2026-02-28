import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  outline?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function PurpleButton({
  label,
  onPress,
  outline = false,
  disabled = false,
  loading = false,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        outline ? styles.outline : styles.solid,
        (disabled || loading) && styles.dimmed,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.purple : colors.white} size="small" />
      ) : (
        <Text style={[styles.label, outline ? styles.outlineText : styles.solidText]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: colors.purple,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.purple,
  },
  dimmed: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  solidText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.purple,
  },
});
