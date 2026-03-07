import { View, Text, Pressable } from '@/lib/tw';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-canvas px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
    >
      <View className="flex-1 justify-center items-center gap-3">
        <Text className="text-42 font-extrabold tracking-[-1px] text-ink">Wyng</Text>
      </View>

      <View className="gap-3">
        <Pressable
          className="bg-ink rounded-radius-14 items-center justify-center"
          style={{ borderCurve: 'continuous', height: 54 }}
          onPress={() => router.push('/(auth)/apple')}
        >
          <Text className="text-canvas font-semibold text-16">{' \uF8FF '}Continue with Apple</Text>
        </Pressable>

        <Pressable
          className="bg-muted rounded-radius-14 items-center justify-center"
          style={{ borderCurve: 'continuous', height: 54 }}
          onPress={() => router.push('/(auth)/sms')}
        >
          <Text className="text-ink font-semibold text-16">Continue with SMS</Text>
        </Pressable>

        <Text className="text-center text-ink-ghost text-12 mt-1">
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}
