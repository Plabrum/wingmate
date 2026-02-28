import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { colors, Fonts } from '@/constants/theme';

type Role = 'dater' | 'winger';

const CARDS: { role: Role; title: string; subtitle: string }[] = [
  {
    role: 'dater',
    title: 'Looking for connections',
    subtitle: 'Browse profiles and go on dates',
  },
  {
    role: 'winger',
    title: 'Here to support friends',
    subtitle: 'Swipe and suggest matches for the people you care about',
  },
];

export default function RoleScreen() {
  const [selected, setSelected] = useState<Role | null>(null);

  function handleContinue() {
    if (!selected) return;
     
    router.push({ pathname: '/(onboarding)/profile' as any, params: { role: selected } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>How do you want to use Wingmate?</Text>

        <View style={styles.cards}>
          {CARDS.map(({ role, title, subtitle }) => (
            <TouchableOpacity
              key={role}
              style={[styles.card, selected === role && styles.cardSelected]}
              onPress={() => setSelected(role)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  title: {
    fontFamily: Fonts?.serif ?? 'serif',
    fontSize: 28,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 36,
    marginBottom: 40,
  },
  cards: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.divider,
    padding: 20,
  },
  cardSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purplePale,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.inkMid,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
});
