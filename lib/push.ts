import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { updatePushToken } from '@/hooks/use-profile';

export async function registerPushToken(userId: string) {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await updatePushToken(userId, token);
}
