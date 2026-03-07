import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { View, Text, TextInput, Pressable } from '@/lib/tw';
import { sendOTP, verifyOTP } from '@/context/auth';
import { formatPhoneInput, toE164 } from '@/lib/phoneUtils';
import { cn } from '@/lib/cn';

type PhoneFields = { phone: string };
type OtpFields = { code: string };

export default function SmsModal() {
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
                  className={cn(
                    'border rounded-xl p-3.5 text-base mt-2',
                    phoneForm.formState.errors.phone ? 'border-red-600' : 'border-separator'
                  )}
                  style={{ borderCurve: 'continuous' }}
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
              <Text className="text-red-600 text-sm">
                {phoneForm.formState.errors.phone.message}
              </Text>
            )}
            {phoneForm.formState.errors.root && (
              <Text className="text-red-600 text-sm">
                {phoneForm.formState.errors.root.message}
              </Text>
            )}
            <Text className="text-sm text-fg-subtle mt-1">
              US numbers are auto-detected. Include a country code for international numbers.
            </Text>
            <View className="mt-2">
              {phoneForm.formState.isSubmitting ? (
                <ActivityIndicator style={{ paddingVertical: 14 }} />
              ) : (
                <Pressable
                  className="bg-accent rounded-xl p-[14px] items-center"
                  style={{ borderCurve: 'continuous' }}
                  onPress={onSubmitPhone}
                >
                  <Text className="text-white font-semibold text-base">Send Code</Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <>
            <Text className="text-sm text-fg-muted mt-2">
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
                  className={cn(
                    'border rounded-xl p-3.5 text-2xl mt-2 text-center',
                    otpForm.formState.errors.code ? 'border-red-600' : 'border-separator'
                  )}
                  style={{ borderCurve: 'continuous', letterSpacing: 6 }}
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
              <Text className="text-red-600 text-sm">{otpForm.formState.errors.code.message}</Text>
            )}
            {otpForm.formState.errors.root && (
              <Text className="text-red-600 text-sm">{otpForm.formState.errors.root.message}</Text>
            )}
            <View className="mt-2 gap-2">
              {otpForm.formState.isSubmitting ? (
                <ActivityIndicator style={{ paddingVertical: 14 }} />
              ) : (
                <>
                  <Pressable
                    className="bg-accent rounded-xl p-[14px] items-center"
                    style={{ borderCurve: 'continuous' }}
                    onPress={onSubmitOtp}
                  >
                    <Text className="text-white font-semibold text-base">Verify</Text>
                  </Pressable>
                  <Pressable className="items-center p-[10px]" onPress={() => setStep('phone')}>
                    <Text className="text-accent text-sm">Change number</Text>
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
