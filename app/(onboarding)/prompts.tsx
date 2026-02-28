import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getPromptTemplates, addProfilePrompt } from '@/queries/prompts';
import { colors, Fonts } from '@/constants/theme';

type Template = { id: string; question: string };
type AddedPrompt = { question: string; answer: string };

const SHOWN_COUNT = 5;

export default function PromptsScreen() {
  const { datingProfileId } = useLocalSearchParams<{ datingProfileId: string }>();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [addedPrompts, setAddedPrompts] = useState<AddedPrompt[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await getPromptTemplates();
        if (fetchError) throw fetchError;
        const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, SHOWN_COUNT);
        setTemplates(shuffled);
      } catch {
        setError('Could not load prompts. You can skip this step.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd(templateId: string, question: string) {
    const answer = answers[templateId]?.trim();
    if (!answer || adding) return;

    setAdding(templateId);
    setError(null);
    try {
      const { error: addError } = await addProfilePrompt(datingProfileId, templateId, answer);
      if (addError) throw addError;
      setAddedPrompts((prev) => [...prev, { question, answer }]);
      setAddedIds((prev) => new Set(prev).add(templateId));
      setExpandedId(null);
      setAnswers((prev) => ({ ...prev, [templateId]: '' }));
    } catch {
      setError('Failed to add prompt. Please try again.');
    } finally {
      setAdding(null);
    }
  }

  function handleFinish() {
     
    router.replace('/(tabs)/discover' as any);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  const visibleTemplates = templates.filter((t) => !addedIds.has(t.id));

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
          <Text style={styles.title}>Tell people something about you.</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Prompt template cards */}
          {visibleTemplates.map((template) => (
            <View key={template.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() =>
                  setExpandedId(expandedId === template.id ? null : template.id)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.cardQuestion}>{template.question}</Text>
                <Text style={styles.chevron}>{expandedId === template.id ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expandedId === template.id && (
                <View style={styles.cardExpanded}>
                  <TextInput
                    style={styles.answerInput}
                    placeholder="Your answer..."
                    placeholderTextColor={colors.inkGhost}
                    value={answers[template.id] ?? ''}
                    onChangeText={(text) =>
                      setAnswers((prev) => ({ ...prev, [template.id]: text }))
                    }
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      (!answers[template.id]?.trim() || adding !== null) &&
                        styles.addBtnDisabled,
                    ]}
                    onPress={() => handleAdd(template.id, template.question)}
                    disabled={!answers[template.id]?.trim() || adding !== null}
                  >
                    {adding === template.id ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.addBtnText}>Add</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* Added prompts section */}
          {addedPrompts.length > 0 && (
            <View style={styles.addedSection}>
              <Text style={styles.addedSectionTitle}>Your prompts</Text>
              {addedPrompts.map((p, i) => (
                <View key={i} style={styles.addedCard}>
                  <Text style={styles.addedQuestion}>{p.question}</Text>
                  <Text style={styles.addedAnswer}>{p.answer}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleFinish}
              style={styles.skipBtn}
              disabled={adding !== null}
            >
              <Text style={[styles.skipText, adding !== null && styles.textDisabled]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, adding !== null && styles.buttonDisabled]}
              onPress={handleFinish}
              disabled={adding !== null}
            >
              <Text style={styles.buttonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: {
    fontFamily: Fonts?.serif ?? 'serif',
    fontSize: 28,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 36,
    marginBottom: 24,
  },
  errorText: { color: '#EF4444', marginBottom: 16, fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.divider,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardQuestion: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    fontWeight: '500',
    lineHeight: 22,
  },
  chevron: { fontSize: 11, color: colors.inkDim, marginLeft: 8 },
  cardExpanded: { paddingHorizontal: 16, paddingBottom: 16 },
  answerInput: {
    backgroundColor: colors.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    minHeight: 80,
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  addedSection: { marginTop: 24, marginBottom: 8 },
  addedSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addedCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  addedQuestion: { fontSize: 13, color: colors.inkMid, marginBottom: 4 },
  addedAnswer: { fontSize: 15, color: colors.ink, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  skipBtn: { paddingVertical: 14, paddingRight: 8 },
  skipText: { fontSize: 16, color: colors.inkMid, fontWeight: '500' },
  textDisabled: { opacity: 0.4 },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '600' },
});
