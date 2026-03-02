import { ActivityIndicator } from 'react-native';
import { Text, Pressable } from '@/lib/tw';
import { cn } from '@/lib/cn';
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
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'rounded-14 py-[15px] px-6 items-center justify-center',
        outline ? 'bg-transparent border-[1.5px] border-purple' : 'bg-purple',
        (disabled || loading) && 'opacity-50'
      )}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.purple : 'white'} size="small" />
      ) : (
        <Text className={cn('text-16 font-semibold', outline ? 'text-purple' : 'text-white')}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
