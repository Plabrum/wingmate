import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner-native';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { View, Text } from '@/lib/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Fonts } from '@/constants/theme';
import DateInput from '@/components/ui/DateInput';
import { GENDERS, CITIES } from '@/constants/enums';
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tell us about yourself</Text>

          <Text style={styles.label}>Your name</Text>
          <Controller
            control={control}
            name="chosenName"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.chosenName && styles.inputError]}
                placeholder="First name or nickname"
                placeholderTextColor={colors.inkGhost}
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
          />

          <Text style={styles.label}>Date of birth</Text>
          <Controller
            control={control}
            name="dateOfBirth"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <DateInput value={value} onChange={onChange} />
            )}
          />

          <Text style={styles.label}>Gender</Text>
          <Controller
            control={control}
            name="gender"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.chips}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, value === g && styles.chipSelected]}
                    onPress={() => onChange(g)}
                  >
                    <Text style={[styles.chipText, value === g && styles.chipTextSelected]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />

          <Text style={styles.label}>Phone number</Text>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="+44 7700 000000"
                placeholderTextColor={colors.inkGhost}
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
              />
            )}
          />

          {isDater && (
            <>
              <Text style={styles.label}>City</Text>
              <Controller
                control={control}
                name="city"
                rules={{ required: isDater }}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.chips}>
                    {CITIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.chip, value === c && styles.chipSelected]}
                        onPress={() => onChange(c)}
                      >
                        <Text style={[styles.chipText, value === c && styles.chipTextSelected]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />

              <Text style={styles.label}>Bio (optional)</Text>
              <Controller
                control={control}
                name="bio"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.bioInput]}
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

          <TouchableOpacity
            style={[styles.button, (!isValid || isSubmitting) && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: {
    fontFamily: Fonts?.serif ?? 'serif',
    fontSize: 28,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 36,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: { borderColor: '#EF4444' },
  bioInput: { height: 100, paddingTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.divider,
    backgroundColor: colors.white,
  },
  chipSelected: { borderColor: colors.purple, backgroundColor: colors.purplePale },
  chipText: { fontSize: 15, color: colors.inkMid, fontWeight: '500' },
  chipTextSelected: { color: colors.purple },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '600' },
});
