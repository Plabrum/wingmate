import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { z } from 'zod';
import { View, Text, ScrollView, Pressable, SafeAreaView } from '@/lib/tw';
import {
  postApiProfilePrompts,
  useGetApiPromptTemplatesOnboardingSuspense,
} from '@/lib/api/generated/prompts/prompts';
import { colors } from '@/constants/theme';
import { createForm, RootError, useFormSubmit } from '@/lib/forms';

type AddedPrompt = { question: string; answer: string };
type Props = { onFinish: () => void };

const answerSchema = z.object({ answer: z.string().trim().min(1) });
const answerForm = createForm(answerSchema);

function AddButton() {
  const { submit, isValid, isSubmitting } = useFormSubmit();
  const disabled = !isValid || isSubmitting;
  return (
    <Pressable
      className={`bg-accent rounded-lg py-2.5 items-center${disabled ? ' opacity-40' : ''}`}
      onPress={submit}
      disabled={disabled}
    >
      {isSubmitting ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Text className="text-white font-semibold text-sm">Add</Text>
      )}
    </Pressable>
  );
}

export default function PromptsStep({ onFinish }: Props) {
  const { data: templates } = useGetApiPromptTemplatesOnboardingSuspense();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addedPrompts, setAddedPrompts] = useState<AddedPrompt[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const visibleTemplates = templates.filter((t) => !addedIds.has(t.id));

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
          <Text className="font-serif text-3xl font-semibold text-fg mb-6">
            Tell people something about you.
          </Text>

          {visibleTemplates.map((template) => (
            <View
              key={template.id}
              className="bg-white rounded-2xl border-[1.5px] border-separator mb-3 overflow-hidden"
            >
              <Pressable
                className="flex-row items-center justify-between p-4"
                onPress={() => setExpandedId((prev) => (prev === template.id ? null : template.id))}
              >
                <Text className="flex-1 text-sm text-fg font-medium">{template.question}</Text>
                <Text className="text-xs text-fg-subtle ml-2">
                  {expandedId === template.id ? '▲' : '▼'}
                </Text>
              </Pressable>

              {expandedId === template.id && (
                <View className="px-4 pb-4">
                  <answerForm.Form
                    defaultValues={{ answer: '' }}
                    onSubmit={async ({ answer }) => {
                      const trimmed = answer.trim();
                      await postApiProfilePrompts({
                        promptTemplateId: template.id,
                        answer: trimmed,
                      });
                      setAddedPrompts((prev) => [
                        ...prev,
                        { question: template.question, answer: trimmed },
                      ]);
                      setAddedIds((prev) => new Set(prev).add(template.id));
                      setExpandedId(null);
                    }}
                  >
                    <answerForm.TextField
                      name="answer"
                      placeholder="Your answer..."
                      multiline
                      autoFocus
                      minHeightClass="min-h-20"
                    />
                    <View className="mt-3">
                      <AddButton />
                    </View>
                    <RootError />
                  </answerForm.Form>
                </View>
              )}
            </View>
          ))}

          {addedPrompts.length > 0 && (
            <View className="mt-6 mb-2">
              <Text className="text-sm font-semibold text-fg-muted uppercase tracking-[0.5px] mb-3">
                Your prompts
              </Text>
              {addedPrompts.map((p, i) => (
                <View key={i} className="bg-white rounded-2xl p-4 mb-2.5 border border-separator">
                  <Text className="text-sm text-fg-muted mb-1">{p.question}</Text>
                  <Text className="text-sm text-fg font-medium">{p.answer}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row items-center justify-between mt-8">
            <Pressable className="py-3.5 pr-2" onPress={onFinish}>
              <Text className="text-base text-fg-muted font-medium">Skip</Text>
            </Pressable>
            <Pressable className="bg-accent rounded-xl py-3.5 px-8 items-center" onPress={onFinish}>
              <Text className="text-white text-base font-semibold">Finish</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
