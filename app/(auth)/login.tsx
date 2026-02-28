import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 42, fontWeight: '800', letterSpacing: -1 }}>Wingmate</Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          Your personal aviation companion
        </Text>
      </View>

      <View style={{ gap: 12 }}>
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
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
            {' \uF8FF '}Continue with Apple
          </Text>
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
          <Text style={{ color: '#000', fontWeight: '600', fontSize: 16 }}>Continue with SMS</Text>
        </Pressable>

        <Text style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 4 }}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}
