import { KeyboardAvoidingView, Platform } from 'react-native';
import { z } from 'zod';
import { View, Text, SafeAreaView, ScrollView } from '@/lib/tw';
import { createForm, RootError, SubmitButton, phoneSchema } from '@/lib/forms';
import { GENDERS, CITIES } from '@/constants/enums';
import type { Database } from '@/types/database';

type Role = Database['public']['Enums']['user_role'];
type Gender = Database['public']['Enums']['gender'];
type City = Database['public']['Enums']['city'];

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

const baseShape = {
  chosenName: z.string().min(1, 'Enter your name'),
  dateOfBirth: z.date({ message: 'Pick a date' }),
  gender: z.enum(GENDERS),
  phoneNumber: phoneSchema,
};

const wingerSchema = z.object(baseShape);
const daterSchema = z.object({
  ...baseShape,
  city: z.enum(CITIES),
  bio: z.string(),
});

const wingerForm = createForm(wingerSchema);
const daterForm = createForm(daterSchema);

function Layout({ children }: { children: React.ReactNode }) {
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
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DaterProfileStep({ defaultPhoneNumber, onNext }: Omit<Props, 'role'>) {
  return (
    <Layout>
      <daterForm.Form
        defaultValues={{
          chosenName: '',
          dateOfBirth: undefined,
          gender: undefined,
          phoneNumber: defaultPhoneNumber,
          city: undefined,
          bio: '',
        }}
        onSubmit={async (v) => {
          const error = await onNext({
            chosenName: v.chosenName,
            dateOfBirth: v.dateOfBirth,
            gender: v.gender,
            phoneNumber: v.phoneNumber,
            city: v.city,
            bio: v.bio,
          });
          if (error) throw new Error(error);
        }}
      >
        <daterForm.TextField
          name="chosenName"
          label="Your name"
          placeholder="First name or nickname"
          autoCapitalize="words"
        />
        <daterForm.DateField name="dateOfBirth" label="Date of birth" />
        <daterForm.ChoiceField name="gender" label="Gender" options={GENDERS} />
        <daterForm.PhoneField name="phoneNumber" label="Phone number" />
        <daterForm.ChoiceField name="city" label="City" options={CITIES} />
        <daterForm.TextField
          name="bio"
          label="Bio (optional)"
          placeholder="A little about you (optional)"
          multiline
        />
        <View className="mt-8">
          <SubmitButton label="Continue" />
        </View>
        <RootError />
      </daterForm.Form>
    </Layout>
  );
}

function WingerProfileStep({ defaultPhoneNumber, onNext }: Omit<Props, 'role'>) {
  return (
    <Layout>
      <wingerForm.Form
        defaultValues={{
          chosenName: '',
          dateOfBirth: undefined,
          gender: undefined,
          phoneNumber: defaultPhoneNumber,
        }}
        onSubmit={async (v) => {
          const error = await onNext({
            chosenName: v.chosenName,
            dateOfBirth: v.dateOfBirth,
            gender: v.gender,
            phoneNumber: v.phoneNumber,
            city: null,
            bio: '',
          });
          if (error) throw new Error(error);
        }}
      >
        <wingerForm.TextField
          name="chosenName"
          label="Your name"
          placeholder="First name or nickname"
          autoCapitalize="words"
        />
        <wingerForm.DateField name="dateOfBirth" label="Date of birth" />
        <wingerForm.ChoiceField name="gender" label="Gender" options={GENDERS} />
        <wingerForm.PhoneField name="phoneNumber" label="Phone number" />
        <View className="mt-8">
          <SubmitButton label="Continue" />
        </View>
        <RootError />
      </wingerForm.Form>
    </Layout>
  );
}

export default function ProfileStep({ role, ...rest }: Props) {
  return role === 'dater' ? <DaterProfileStep {...rest} /> : <WingerProfileStep {...rest} />;
}
