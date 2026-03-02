import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { ScrollView, Text, View } from '@/lib/tw';
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
      contentContainerClassName="flex-1 p-6 justify-center gap-5"
    >
      <View className="items-center gap-2">
        <Text className="text-[20px] font-bold">Welcome to Orbit</Text>
        <Text className="text-15 text-[#666] text-center">
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
        <Text className="text-center text-[#999] text-14">
          Apple Sign In is only available on iOS.
        </Text>
      )}
    </ScrollView>
  );
}
