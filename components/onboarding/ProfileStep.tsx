import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import { KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { View, Text, SafeAreaView, TextInput, ScrollView, Pressable } from '@/lib/tw';
import DateInput from '@/components/ui/DateInput';
import { GENDERS, CITIES } from '@/constants/enums';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import type { Database } from '@/types/database';

type Role = Database['public']['Enums']['user_role'];
type Gender = Database['public']['Enums']['gender'];
type City = Database['public']['Enums']['city'];

type FormValues = {
  chosenName: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  phoneNumber: string;
  city: City | null;
  bio: string;
};

export type ProfileFields = {
  chosenName: string;
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber: string;
  city: City | null;
  bio: string;
};

type Props = {
  role: Role;
  defaultPhoneNumber: string;
  onNext: (fields: ProfileFields) => Promise<string | undefined>;
};

export default function ProfileStep({ role, defaultPhoneNumber, onNext }: Props) {
  const isDater = role === 'dater';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      chosenName: '',
      dateOfBirth: null,
      gender: null,
      phoneNumber: defaultPhoneNumber,
      city: null,
      bio: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const error = await onNext({
      chosenName: values.chosenName,
      dateOfBirth: values.dateOfBirth!,
      gender: values.gender!,
      phoneNumber: values.phoneNumber,
      city: values.city,
      bio: values.bio,
    });
    if (error) toast.error(error);
  });

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-serif text-3xl font-semibold text-fg mb-7">
            Tell us about yourself
          </Text>

          <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-2 mt-5">
            Your name
          </Text>
          <Controller
            control={control}
            name="chosenName"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={cn(
                  'bg-white rounded-xl border-[1.5px] border-separator px-4 py-[14px] text-base text-fg',
                  errors.chosenName && 'border-[#EF4444]'
                )}
                placeholder="First name or nickname"
                placeholderTextColor={colors.inkGhost}
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
          />

          <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-2 mt-5">
            Date of birth
          </Text>
          <Controller
            control={control}
            name="dateOfBirth"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <DateInput value={value} onChange={onChange} />
            )}
          />

          <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-2 mt-5">
            Gender
          </Text>
          <Controller
            control={control}
            name="gender"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <View className="flex-row flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <Pressable
                    key={g}
                    className={cn(
                      'px-4 py-[10px] rounded-[24px] border-[1.5px] border-separator bg-white',
                      value === g && 'border-accent bg-accent-muted'
                    )}
                    onPress={() => onChange(g)}
                  >
                    <Text
                      className={cn(
                        'text-sm text-fg-muted font-medium',
                        value === g && 'text-accent'
                      )}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />

          <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-2 mt-5">
            Phone number
          </Text>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-white rounded-xl border-[1.5px] border-separator px-4 py-[14px] text-base text-fg"
                placeholder="+1 555 000 0000"
                placeholderTextColor={colors.inkGhost}
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
              />
            )}
          />

          {isDater && (
            <>
              <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-2 mt-5">
                City
              </Text>
              <Controller
                control={control}
                name="city"
                rules={{ required: isDater }}
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row flex-wrap gap-2">
                    {CITIES.map((c) => (
                      <Pressable
                        key={c}
                        className={cn(
                          'px-4 py-[10px] rounded-[24px] border-[1.5px] border-separator bg-white',
                          value === c && 'border-accent bg-accent-muted'
                        )}
                        onPress={() => onChange(c)}
                      >
                        <Text
                          className={cn(
                            'text-sm text-fg-muted font-medium',
                            value === c && 'text-accent'
                          )}
                        >
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />

              <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-2 mt-5">
                Bio (optional)
              </Text>
              <Controller
                control={control}
                name="bio"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="bg-white rounded-xl border-[1.5px] border-separator px-4 pt-[14px] text-base text-fg h-[100px]"
                    placeholder="A little about you (optional)"
                    placeholderTextColor={colors.inkGhost}
                    value={value}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                )}
              />
            </>
          )}

          <Pressable
            className={cn(
              'bg-accent rounded-xl py-4 items-center mt-8',
              (!isValid || isSubmitting) && 'opacity-40'
            )}
            onPress={onSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-white text-base font-semibold">Continue</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
