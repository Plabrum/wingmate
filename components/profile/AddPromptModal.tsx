import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { getPromptTemplates, addProfilePrompt } from '@/queries/prompts';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ErrorBanner } from './profile-helpers';

interface Props {
  visible: boolean;
  onClose: () => void;
  usedTemplateIds: Set<string>;
  datingProfileId: string;
  onAdded: () => void;
}

export function AddPromptModal({
  visible,
  onClose,
  usedTemplateIds,
  datingProfileId,
  onAdded,
}: Props) {
  const [templates, setTemplates] = useState<{ id: string; question: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; question: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setAnswer('');
    setErr(null);
    getPromptTemplates().then(({ data }) => {
      setTemplates((data ?? []).filter((t) => !usedTemplateIds.has(t.id)));
    });
  }, [visible, usedTemplateIds]);

  const handleSave = async () => {
    if (!selected || !answer.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const { error } = await addProfilePrompt(datingProfileId, selected.id, answer.trim());
      if (error) throw error;
      onAdded();
      onClose();
    } catch {
      setErr('Could not save prompt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={st.root}
      >
        <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
          <View style={st.header}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={st.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={st.title}>{selected ? 'Write Your Answer' : 'Pick a Prompt'}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!selected || !answer.trim() || saving}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[st.save, (!selected || !answer.trim() || saving) && st.saveDim]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {err && <ErrorBanner message={err} />}

          {!selected ? (
            <FlatList
              data={templates}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={st.templateRow}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.7}
                >
                  <Text style={st.templateQ}>{item.question}</Text>
                  <IconSymbol name="chevron.right" size={15} color={colors.inkGhost} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={st.sep} />}
              ListEmptyComponent={
                <Text style={st.empty}>You{"'"}ve answered all available prompts.</Text>
              }
            />
          ) : (
            <ScrollView contentContainerStyle={st.answerContent}>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                style={st.backRow}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="chevron.left" size={13} color={colors.purple} />
                <Text style={st.backTxt}>Back to prompts</Text>
              </TouchableOpacity>
              <Text style={st.questionTxt}>{selected.question}</Text>
              <TextInput
                style={st.answerInput}
                placeholder="Write your answer…"
                placeholderTextColor={colors.inkGhost}
                value={answer}
                onChangeText={setAnswer}
                multiline
                autoFocus
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={st.charCount}>{answer.length}/300</Text>
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.white,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink },
  cancel: { fontSize: 15, color: colors.inkMid },
  save: { fontSize: 15, fontWeight: '600', color: colors.purple },
  saveDim: { opacity: 0.4 },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  templateQ: { flex: 1, fontSize: 15, color: colors.ink, paddingRight: 12 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: 20 },
  empty: { padding: 36, textAlign: 'center', color: colors.inkMid, fontSize: 15 },
  answerContent: { padding: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backTxt: { fontSize: 14, color: colors.purple },
  questionTxt: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'Georgia',
    marginBottom: 20,
    lineHeight: 28,
  },
  answerInput: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.ink,
    minHeight: 130,
    lineHeight: 24,
  },
  charCount: { fontSize: 12, color: colors.inkGhost, textAlign: 'right', marginTop: 6 },
});
