import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import { toast } from 'sonner-native';

import { colors } from '@/constants/theme';
import { getPromptTemplates, addProfilePrompt } from '@/queries/prompts';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { cn } from '@/lib/cn';
import { View, Text, TextInput, ScrollView, Pressable, SafeAreaView } from '@/lib/tw';

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

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isValid },
  } = useForm<{ answer: string }>({
    defaultValues: { answer: '' },
    mode: 'onChange',
  });

  const onOpen = async () => {
    reset({ answer: '' });
    setSelected(null);
    const { data } = await getPromptTemplates();
    setTemplates((data ?? []).filter((t) => !usedTemplateIds.has(t.id)));
  };

  const onSubmit = async (values: { answer: string }) => {
    if (!selected) return;
    const { error } = await addProfilePrompt(datingProfileId, selected.id, values.answer.trim());
    if (error) {
      toast.error('Could not save prompt. Please try again.');
      return;
    }
    onAdded();
    onClose();
  };

  const answerLength = watch('answer').length;
  const saveDisabled = !selected || !isValid || isSubmitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={onOpen}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 bg-canvas">
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View
              className="flex-row items-center justify-between px-5 py-[14px] bg-white"
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.divider,
              }}
            >
              <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text className="text-15 text-ink-mid">Cancel</Text>
              </Pressable>
              <Text className="text-16 font-semibold text-ink">
                {selected ? 'Write Your Answer' : 'Pick a Prompt'}
              </Text>
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={saveDisabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  className={cn('text-15 font-semibold text-purple', saveDisabled && 'opacity-40')}
                >
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>

            {!selected ? (
              <FlatList
                data={templates}
                keyExtractor={(t) => t.id}
                renderItem={({ item }) => (
                  <Pressable
                    className="flex-row items-center bg-white px-5 py-4"
                    onPress={() => setSelected(item)}
                  >
                    <Text className="flex-1 text-15 text-ink pr-3">{item.question}</Text>
                    <IconSymbol name="chevron.right" size={15} color={colors.inkGhost} />
                  </Pressable>
                )}
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: colors.divider,
                      marginLeft: 20,
                    }}
                  />
                )}
                ListEmptyComponent={
                  <Text className="p-9 text-center text-ink-mid text-15">
                    You{"'"}ve answered all available prompts.
                  </Text>
                }
              />
            ) : (
              <ScrollView contentContainerClassName="p-5">
                <Pressable
                  onPress={() => setSelected(null)}
                  className="flex-row items-center gap-1 mb-4"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol name="chevron.left" size={13} color={colors.purple} />
                  <Text className="text-14 text-purple">Back to prompts</Text>
                </Pressable>
                <Text className="text-[20px] font-bold text-ink font-serif mb-5 leading-7">
                  {selected.question}
                </Text>
                <Controller
                  control={control}
                  name="answer"
                  rules={{ required: true, validate: (v) => v.trim().length > 0 }}
                  render={({ field }) => (
                    <TextInput
                      className="bg-white rounded-14 p-4 text-16 text-ink min-h-[130px] leading-6"
                      placeholder="Write your answer…"
                      placeholderTextColor={colors.inkGhost}
                      value={field.value}
                      onChangeText={field.onChange}
                      multiline
                      autoFocus
                      maxLength={300}
                      textAlignVertical="top"
                    />
                  )}
                />
                <Text className="text-12 text-ink-ghost text-right mt-1.5">{answerLength}/300</Text>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
