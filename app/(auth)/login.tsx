import { View, Text, Pressable } from '@/lib/tw';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-page px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
    >
      <View className="flex-1 justify-center items-center gap-3">
        <Text className="text-4xl font-extrabold tracking-[-1px] text-fg">Wyng</Text>
      </View>

      <View className="gap-3">
        <Pressable
          className="bg-fg rounded-xl items-center justify-center"
          style={{ borderCurve: 'continuous', height: 54 }}
          onPress={() => router.push('/(auth)/apple')}
        >
          <Text className="text-page font-semibold text-base">{' \uF8FF '}Continue with Apple</Text>
        </Pressable>

        <Text className="text-center text-fg-ghost text-xs mt-1">
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}
