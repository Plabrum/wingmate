import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useSupabaseSuspenseQuery } from '@/lib/useSuspenseQuery';
import { KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { View, Text, ScrollView, TextInput, Pressable, SafeAreaView } from '@/lib/tw';
import { getOnboardingPromptTemplates, addProfilePrompt } from '@/queries/prompts';
import { colors } from '@/constants/theme';
import { toast } from 'sonner-native';

type FormValues = { answer: string };
type AddedPrompt = { question: string; answer: string };

type Props = { dpId: string; onFinish: () => void };

export default function PromptsStep({ dpId, onFinish }: Props) {
  const templates = useSupabaseSuspenseQuery(getOnboardingPromptTemplates);
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
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-serif text-28 font-semibold text-ink mb-6">
            Tell people something about you.
          </Text>

          {visibleTemplates.map((template) => (
            <View
              key={template.id}
              className="bg-white rounded-16 border-[1.5px] border-divider mb-3 overflow-hidden"
            >
              <Pressable
                className="flex-row items-center justify-between p-4"
                onPress={() => toggleExpand(template.id)}
              >
                <Text className="flex-1 text-15 text-ink font-medium">{template.question}</Text>
                <Text className="text-11 text-ink-dim ml-2">
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
                        className="bg-canvas rounded-[10px] border border-divider p-3 text-15 text-ink min-h-20 mb-3"
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
                    className={`bg-purple rounded-[10px] py-2.5 items-center${!isValid || isSubmitting ? ' opacity-40' : ''}`}
                    onPress={onAdd}
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text className="text-white font-semibold text-15">Add</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          ))}

          {addedPrompts.length > 0 && (
            <View className="mt-6 mb-2">
              <Text className="text-13 font-semibold text-ink-mid uppercase tracking-[0.5px] mb-3">
                Your prompts
              </Text>
              {addedPrompts.map((p, i) => (
                <View key={i} className="bg-white rounded-16 p-4 mb-2.5 border border-divider">
                  <Text className="text-13 text-ink-mid mb-1">{p.question}</Text>
                  <Text className="text-15 text-ink font-medium">{p.answer}</Text>
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
              <Text className="text-16 text-ink-mid font-medium">Skip</Text>
            </Pressable>
            <Pressable
              className={`bg-purple rounded-14 py-3.5 px-8 items-center${isSubmitting ? ' opacity-40' : ''}`}
              onPress={onFinish}
              disabled={isSubmitting}
            >
              <Text className="text-white text-17 font-semibold">Finish</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
