import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function AppleModal() {
  const handleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identityToken.');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (!error && credential.fullName) {
        const parts = [
          credential.fullName.givenName,
          credential.fullName.middleName,
          credential.fullName.familyName,
        ].filter(Boolean);

        if (parts.length > 0) {
          await supabase.auth.updateUser({
            data: {
              full_name: parts.join(' '),
              given_name: credential.fullName.givenName,
              family_name: credential.fullName.familyName,
            },
          });
        }
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign-in error:', e);
      }
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flex: 1, padding: 24, justifyContent: 'center', gap: 20 }}
    >
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Welcome to Wingmate</Text>
        <Text style={{ fontSize: 15, color: '#666', textAlign: 'center' }}>
          Use your Apple ID to securely sign in. No password required.
        </Text>
      </View>

      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ height: 54 }}
          onPress={handleSignIn}
        />
      ) : (
        <Text style={{ textAlign: 'center', color: '#999', fontSize: 14 }}>
          Apple Sign In is only available on iOS.
        </Text>
      )}
    </ScrollView>
  );
}
