import { View, Text, Pressable } from '@/lib/tw';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
    >
      <View className="flex-1 justify-center items-center gap-3">
        <Text className="text-[42px] font-extrabold tracking-[-1px]">Orbit</Text>
        <Text className="text-16 text-ink-mid text-center">Your personal aviation companion</Text>
      </View>

      <View className="gap-3">
        <Pressable
          className="bg-black active:bg-[#1a1a1a] rounded-[14px] h-[54px] items-center justify-center"
          style={{ borderCurve: 'continuous' }}
          onPress={() => router.push('/(auth)/apple')}
        >
          <Text className="text-white font-semibold text-16">{' \uF8FF '}Continue with Apple</Text>
        </Pressable>

        <Pressable
          className="bg-[#f2f2f7] active:bg-[#e8e8e8] rounded-[14px] h-[54px] items-center justify-center"
          style={{ borderCurve: 'continuous' }}
          onPress={() => router.push('/(auth)/sms')}
        >
          <Text className="text-black font-semibold text-16">Continue with SMS</Text>
        </Pressable>

        <Text className="text-center text-ink-ghost text-12 mt-1">
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}
