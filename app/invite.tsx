import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/auth';

export default function InviteRedirect() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) {
       
      router.replace('/(tabs)/profile/wingpeople/' as any);
    } else {
      AsyncStorage.setItem('pending_invite', '1').then(() => {
        router.replace('/(auth)/login');
      });
    }
  }, [session, loading]);

  return null;
}
