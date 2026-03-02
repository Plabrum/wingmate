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
        <Text className="text-16 text-[#666] text-center">Your personal aviation companion</Text>
      </View>

      <View className="gap-3">
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#1a1a1a' : '#000',
            borderRadius: 14,
            borderCurve: 'continuous',
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          })}
          onPress={() => router.push('/(auth)/apple')}
        >
          <Text className="text-white font-semibold text-16">{' \uF8FF '}Continue with Apple</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#e8e8e8' : '#f2f2f7',
            borderRadius: 14,
            borderCurve: 'continuous',
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          })}
          onPress={() => router.push('/(auth)/sms')}
        >
          <Text className="text-[#000] font-semibold text-16">Continue with SMS</Text>
        </Pressable>

        <Text className="text-center text-[#aaa] text-12 mt-1">
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}
