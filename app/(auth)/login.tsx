import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/context/auth';

export default function LoginScreen() {
  const { sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    setLoading(true);
    try {
      await sendOTP(phone);
      setStep('otp');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    try {
      await verifyOTP(phone, code);
    } catch (err: unknown) {
      Alert.alert('Verification failed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Wingmate</Text>

        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="+1 555 000 0000"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
            />
            <Text style={styles.hint}>
              Enter your number in international format, e.g. +15550001234
            </Text>
            {loading ? (
              <ActivityIndicator style={styles.button} />
            ) : (
              <Pressable style={styles.button} onPress={handleSendCode}>
                <Text style={styles.buttonText}>Send Code</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            {loading ? (
              <ActivityIndicator style={styles.button} />
            ) : (
              <>
                <Pressable style={styles.button} onPress={handleVerify}>
                  <Text style={styles.buttonText}>Verify</Text>
                </Pressable>
                <Pressable style={styles.link} onPress={() => setStep('phone')}>
                  <Text style={styles.linkText}>Change number</Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 32, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  hint: { fontSize: 12, color: '#888', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { alignItems: 'center', padding: 10 },
  linkText: { color: '#2563eb', fontSize: 14 },
});
