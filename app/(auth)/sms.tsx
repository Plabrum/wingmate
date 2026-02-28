import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { formatPhoneInput, toE164 } from '@/lib/phoneUtils';

type PhoneFields = { phone: string };
type OtpFields = { code: string };

export default function SmsModal() {
  const { sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [e164Phone, setE164Phone] = useState('');

  const phoneForm = useForm<PhoneFields>({ defaultValues: { phone: '' } });
  const otpForm = useForm<OtpFields>({ defaultValues: { code: '' } });

  const onSubmitPhone = phoneForm.handleSubmit(async ({ phone }) => {
    const normalized = toE164(phone);
    if (!normalized) {
      phoneForm.setError('phone', { message: 'Enter a valid phone number.' });
      return;
    }
    const { error } = await sendOTP(normalized);
    if (error) {
      phoneForm.setError('root', { message: error.message });
      return;
    }
    setE164Phone(normalized);
    setStep('otp');
  });

  const onSubmitOtp = otpForm.handleSubmit(async ({ code }) => {
    const { error } = await verifyOTP(e164Phone, code);
    if (error) otpForm.setError('root', { message: error.message });
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 24, gap: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'phone' ? (
          <>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: phoneForm.formState.errors.phone ? '#dc2626' : '#ddd',
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    padding: 14,
                    fontSize: 17,
                    marginTop: 8,
                  }}
                  placeholder="(555) 000-0000"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  autoFocus
                  value={value}
                  onChangeText={(text) => onChange(formatPhoneInput(text))}
                />
              )}
            />
            {phoneForm.formState.errors.phone && (
              <Text style={{ color: '#dc2626', fontSize: 13 }}>
                {phoneForm.formState.errors.phone.message}
              </Text>
            )}
            {phoneForm.formState.errors.root && (
              <Text style={{ color: '#dc2626', fontSize: 13 }}>
                {phoneForm.formState.errors.root.message}
              </Text>
            )}
            <Text style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
              US numbers are auto-detected. Include a country code (e.g. +44) for international.
            </Text>
            <View style={{ marginTop: 8 }}>
              {phoneForm.formState.isSubmitting ? (
                <ActivityIndicator style={{ paddingVertical: 14 }} />
              ) : (
                <Pressable
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#1d4ed8' : '#2563eb',
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    padding: 14,
                    alignItems: 'center',
                  })}
                  onPress={onSubmitPhone}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Send Code</Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 15, color: '#555', marginTop: 8 }}>
              We sent a 6-digit code to {e164Phone}
            </Text>
            <Controller
              control={otpForm.control}
              name="code"
              rules={{
                required: 'Enter the 6-digit code.',
                minLength: { value: 6, message: 'Code must be 6 digits.' },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: otpForm.formState.errors.code ? '#dc2626' : '#ddd',
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    padding: 14,
                    fontSize: 24,
                    letterSpacing: 6,
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {otpForm.formState.errors.code && (
              <Text style={{ color: '#dc2626', fontSize: 13 }}>
                {otpForm.formState.errors.code.message}
              </Text>
            )}
            {otpForm.formState.errors.root && (
              <Text style={{ color: '#dc2626', fontSize: 13 }}>
                {otpForm.formState.errors.root.message}
              </Text>
            )}
            <View style={{ marginTop: 8, gap: 8 }}>
              {otpForm.formState.isSubmitting ? (
                <ActivityIndicator style={{ paddingVertical: 14 }} />
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#1d4ed8' : '#2563eb',
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      padding: 14,
                      alignItems: 'center',
                    })}
                    onPress={onSubmitOtp}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Verify</Text>
                  </Pressable>
                  <Pressable
                    style={{ alignItems: 'center', padding: 10 }}
                    onPress={() => setStep('phone')}
                  >
                    <Text style={{ color: '#2563eb', fontSize: 14 }}>Change number</Text>
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
