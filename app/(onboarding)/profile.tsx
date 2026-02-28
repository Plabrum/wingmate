import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/profile';
import { updateBaseProfile } from '@/queries/profiles';
import { colors, Fonts } from '@/constants/theme';
import type { Database } from '@/types/database';

type Gender = Database['public']['Enums']['gender'];
type City = Database['public']['Enums']['city'];
type Role = Database['public']['Enums']['user_role'];

const GENDERS: Gender[] = ['Male', 'Female', 'Non-Binary'];
const CITIES: City[] = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];

export default function ProfileScreen() {
  const { role } = useLocalSearchParams<{ role: Role }>();
  const { session } = useAuth();
  const { refreshProfile } = useProfile();
  const userId = session?.user.id ?? '';

  const [chosenName, setChosenName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(2000, 0, 1));
  const [gender, setGender] = useState<Gender | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(session?.user.phone ?? '');
  const [city, setCity] = useState<City | null>(null);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDater = role === 'dater';

  const isValid =
    chosenName.trim().length > 0 &&
    dateOfBirth !== null &&
    gender !== null &&
    (!isDater || city !== null);

  function formatDate(date: Date) {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await updateBaseProfile(userId, {
        chosen_name: chosenName.trim(),
        date_of_birth: dateOfBirth!.toISOString().split('T')[0],
        phone_number: phoneNumber.trim() || null,
        gender: gender!,
        role: role as Role,
      });
      if (updateError) throw updateError;
      await refreshProfile();
      if (isDater) {
         
        router.replace({
          pathname: '/(onboarding)/photos' as any,
          params: { city: city!, bio: bio.trim() || '' },
        });
      } else {
         
        router.replace('/(tabs)/profile' as any);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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

          {/* Name */}
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            placeholder="First name or nickname"
            placeholderTextColor={colors.inkGhost}
            value={chosenName}
            onChangeText={setChosenName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Date of birth */}
          <Text style={styles.label}>Date of birth</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateTouchable]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
              {dateOfBirth ? formatDate(dateOfBirth) : 'Date of birth'}
            </Text>
          </TouchableOpacity>

          {/* Android date picker shown inline when triggered */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dateOfBirth ?? tempDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setDateOfBirth(date);
              }}
            />
          )}

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, gender === g && styles.chipSelected]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Phone */}
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="+44 7700 000000"
            placeholderTextColor={colors.inkGhost}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          {/* Dater-only fields */}
          {isDater && (
            <>
              <Text style={styles.label}>City</Text>
              <View style={styles.chips}>
                {CITIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, city === c && styles.chipSelected]}
                    onPress={() => setCity(c)}
                  >
                    <Text style={[styles.chipText, city === c && styles.chipTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Bio (optional)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="A little about you (optional)"
                placeholderTextColor={colors.inkGhost}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerSheet}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateOfBirth ?? tempDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  if (date) {
                    setDateOfBirth(date);
                    setTempDate(date);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
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
  dateTouchable: { justifyContent: 'center' },
  dateText: { fontSize: 16, color: colors.ink },
  datePlaceholder: { fontSize: 16, color: colors.inkGhost },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.divider,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purplePale,
  },
  chipText: { fontSize: 15, color: colors.inkMid, fontWeight: '500' },
  chipTextSelected: { color: colors.purple },
  bioInput: { height: 100, paddingTop: 14 },
  errorText: { color: '#EF4444', marginTop: 16, fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  datePickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  datePickerDone: {
    color: colors.purple,
    fontSize: 17,
    fontWeight: '600',
  },
});
