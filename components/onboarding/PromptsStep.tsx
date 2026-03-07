import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { View, Text, ScrollView, TextInput, Pressable, SafeAreaView } from '@/lib/tw';
import { useOnboardingPromptTemplates, addProfilePrompt } from '@/queries/prompts';
import { colors } from '@/constants/theme';
import { toast } from 'sonner-native';

type FormValues = { answer: string };
type AddedPrompt = { question: string; answer: string };

type Props = { dpId: string; onFinish: () => void };

export default function PromptsStep({ dpId, onFinish }: Props) {
  const { data: templates } = useOnboardingPromptTemplates();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addedPrompts, setAddedPrompts] = useState<AddedPrompt[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { answer: '' },
  });

  function toggleExpand(templateId: string) {
    setExpandedId((prev) => (prev === templateId ? null : templateId));
    reset({ answer: '' });
  }

  const onAdd = handleSubmit(async ({ answer }) => {
    if (!expandedId) return;
    const question = templates.find((t) => t.id === expandedId)?.question ?? '';
    const { error } = await addProfilePrompt(dpId, expandedId, answer.trim());
    if (error) {
      toast.error('Failed to add prompt. Please try again.');
      return;
    }
    setAddedPrompts((prev) => [...prev, { question, answer: answer.trim() }]);
    setAddedIds((prev) => new Set(prev).add(expandedId));
    setExpandedId(null);
    reset({ answer: '' });
  });

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
                onPress={() => toggleExpand(template.id)}
              >
                <Text className="flex-1 text-sm text-fg font-medium">{template.question}</Text>
                <Text className="text-xs text-fg-subtle ml-2">
                  {expandedId === template.id ? '▲' : '▼'}
                </Text>
              </Pressable>

              {expandedId === template.id && (
                <View className="px-4 pb-4">
                  <Controller
                    control={control}
                    name="answer"
                    rules={{ required: true }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        className="bg-page rounded-lg border border-separator p-3 text-sm text-fg min-h-20 mb-3"
                        placeholder="Your answer..."
                        placeholderTextColor={colors.inkGhost}
                        value={value}
                        onChangeText={onChange}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        autoFocus
                      />
                    )}
                  />
                  <Pressable
                    className={`bg-accent rounded-lg py-2.5 items-center${!isValid || isSubmitting ? ' opacity-40' : ''}`}
                    onPress={onAdd}
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">Add</Text>
                    )}
                  </Pressable>
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
            <Pressable
              className={`py-3.5 pr-2${isSubmitting ? ' opacity-40' : ''}`}
              onPress={onFinish}
              disabled={isSubmitting}
            >
              <Text className="text-base text-fg-muted font-medium">Skip</Text>
            </Pressable>
            <Pressable
              className={`bg-accent rounded-xl py-3.5 px-8 items-center${isSubmitting ? ' opacity-40' : ''}`}
              onPress={onFinish}
              disabled={isSubmitting}
            >
              <Text className="text-white text-base font-semibold">Finish</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
