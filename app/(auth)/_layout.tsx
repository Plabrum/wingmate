import { Stack, Redirect } from 'expo-router';
import { useSession } from '@/context/auth';
import Splash from '@/components/ui/Splash';

export default function AuthLayout() {
  const { session, loading } = useSession();

  if (loading) return <Splash variant="spinner" />;
  if (session) return <Redirect href="/(tabs)/discover" />;

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="sms"
        options={{
          presentation: 'formSheet',
          headerShown: true,
          title: 'Phone Number',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.65, 1.0],
        }}
      />
      <Stack.Screen
        name="apple"
        options={{
          presentation: 'formSheet',
          headerShown: true,
          title: 'Sign in with Apple',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.45, 1.0],
        }}
      />
    </Stack>
  );
}
