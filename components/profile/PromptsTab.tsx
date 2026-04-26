import { useState } from 'react';
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import { toast } from 'sonner-native';
import type { UseFormReturn } from 'react-hook-form';

import { colors } from '@/constants/theme';
import type { OwnDatingProfileResponse, OwnPromptResponse } from '@/lib/api/generated/model';
import {
  deleteApiProfilePromptsId,
  deleteApiPromptResponsesId,
  postApiPromptResponsesIdApprove,
} from '@/lib/api/generated/prompts/prompts';

import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScrollView, Text, View, Pressable } from '@/lib/tw';
import { AddPromptModal } from './AddPromptModal';
import { getInitials } from './profile-helpers';

// ── Approved responses carousel ───────────────────────────────────────────────

// screen width minus the two levels of padding: px-5 (20px) on the tab + p-4 (16px) on the card
const SLIDE_WIDTH = Dimensions.get('window').width - 20 * 2 - 16 * 2;
const PEEK = 20; // px of next card visible to hint at swiping
const SNAP_INTERVAL = SLIDE_WIDTH - PEEK + 8; // slide width minus peek + gap between slides

type ApprovedResponse = OwnPromptResponse;

function ApprovedResponsesCarousel({ responses }: { responses: ApprovedResponse[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL));
  };

  return (
    <View
      className="mt-[14px] pt-3"
      style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingRight: PEEK }}
      >
        {responses.map((r, i) => (
          <View
            key={r.id}
            className="bg-page rounded-xl p-3"
            style={{
              width: SLIDE_WIDTH - PEEK,
              marginRight: i < responses.length - 1 ? 8 : 0,
            }}
          >
            <View className="flex-row gap-2.5">
              <FaceAvatar
                initials={getInitials(r.author?.chosenName)}
                size={28}
                photoUri={r.author?.avatarUrl ?? null}
              />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-fg-muted mb-[3px]">
                  {r.author?.chosenName ?? 'Wingperson'}
                </Text>
                <Text className="text-sm text-fg leading-5">{r.message}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {responses.length > 1 && (
        <View className="flex-row justify-center gap-1.5 mt-3">
          {responses.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIdx ? 14 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIdx ? colors.purple : colors.inkGhost,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface Props {
  form: UseFormReturn<NonNullable<OwnDatingProfileResponse>>;
  onRefresh: () => void;
}

export function PromptsTab({ form, onRefresh }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const prompts = form.watch('prompts');
  const usedTemplateIds = new Set(prompts.map((p) => p.template.id));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleApproveResponse = async (promptId: string, responseId: string) => {
    const prev = prompts;
    form.setValue(
      'prompts',
      prompts.map((p) =>
        p.id === promptId
          ? {
              ...p,
              responses: p.responses.map((r) =>
                r.id === responseId ? { ...r, isApproved: true } : r
              ),
            }
          : p
      )
    );
    try {
      await postApiPromptResponsesIdApprove(responseId);
    } catch {
      form.setValue('prompts', prev);
      toast.error('Could not approve comment.');
    }
  };

  const handleRejectResponse = async (promptId: string, responseId: string) => {
    const prev = prompts;
    form.setValue(
      'prompts',
      prompts.map((p) =>
        p.id === promptId ? { ...p, responses: p.responses.filter((r) => r.id !== responseId) } : p
      )
    );
    try {
      await deleteApiPromptResponsesId(responseId);
    } catch {
      form.setValue('prompts', prev);
      toast.error('Could not reject comment.');
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    const prev = prompts;
    form.setValue(
      'prompts',
      prompts.filter((p) => p.id !== promptId)
    );
    try {
      await deleteApiProfilePromptsId(promptId);
    } catch {
      form.setValue('prompts', prev);
      toast.error('Could not remove prompt.');
    }
  };

  return (
    <ScrollView contentContainerClassName="p-5 pb-12" showsVerticalScrollIndicator={false}>
      {prompts.length === 0 && (
        <View className="bg-white rounded-xl p-7 items-center mb-[14px]">
          <Text className="text-sm font-semibold text-fg">No prompts yet.</Text>
          <Text className="text-sm text-fg-muted mt-1.5 text-center">
            Add one to give people something to connect with.
          </Text>
        </View>
      )}

      {prompts.map((prompt) => {
        const pendingR = prompt.responses.filter((r) => !r.isApproved);
        const approvedR = prompt.responses.filter((r) => r.isApproved);
        const isExpanded = expanded.has(prompt.id);

        return (
          <View key={prompt.id} className="bg-white rounded-xl p-4 mb-[14px]">
            <Text className="text-sm font-semibold text-accent mb-1.5">
              {prompt.template.question}
            </Text>
            <Text className="text-base text-fg leading-[22px] font-serif">{prompt.answer}</Text>

            {/* Approved wing comments — swipeable card carousel */}
            {approvedR.length > 0 && <ApprovedResponsesCarousel responses={approvedR} />}

            {/* Pending responses */}
            {pendingR.length > 0 && (
              <>
                <Pressable
                  className="flex-row items-center gap-1.5 mt-[14px] pt-3"
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.divider,
                  }}
                  onPress={() => toggle(prompt.id)}
                >
                  <Text className="flex-1 text-sm font-semibold text-accent">
                    {pendingR.length} wingperson comment{pendingR.length > 1 ? 's' : ''} waiting
                  </Text>
                  <IconSymbol
                    name={isExpanded ? 'chevron.up' : 'chevron.down'}
                    size={13}
                    color={colors.purple}
                  />
                </Pressable>
                {isExpanded &&
                  pendingR.map((r) => (
                    <View key={r.id} className="flex-row gap-2.5 mt-3">
                      <FaceAvatar
                        initials={getInitials(r.author?.chosenName)}
                        size={28}
                        photoUri={r.author?.avatarUrl ?? null}
                      />
                      <View className="flex-1">
                        <Text className="text-sm text-fg leading-5">{r.message}</Text>
                        <View className="flex-row gap-2 mt-2">
                          <Pressable
                            className="px-3 py-1.5 rounded-lg bg-accent"
                            onPress={() => handleApproveResponse(prompt.id, r.id)}
                          >
                            <Text className="text-white text-sm font-semibold">Approve</Text>
                          </Pressable>
                          <Pressable
                            className="px-3 py-1.5 rounded-lg bg-surface"
                            onPress={() => handleRejectResponse(prompt.id, r.id)}
                          >
                            <Text className="text-fg text-sm font-semibold">Reject</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
              </>
            )}

            {/* Delete prompt */}
            <Pressable
              className="mt-[14px] pt-3"
              style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }}
              onPress={() =>
                Alert.alert('Remove prompt?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => handleDeletePrompt(prompt.id),
                  },
                ])
              }
            >
              <Text className="text-sm text-[#EF4444] font-medium">Remove prompt</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        className="flex-row items-center justify-center gap-2 rounded-xl py-[14px] min-h-[52px]"
        style={{ borderWidth: 1.5, borderColor: colors.purple, borderStyle: 'dashed' }}
        onPress={() => setModalVisible(true)}
      >
        <IconSymbol name="plus" size={18} color={colors.purple} />
        <Text className="text-sm font-semibold text-accent">Add Prompt</Text>
      </Pressable>

      <AddPromptModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        usedTemplateIds={usedTemplateIds}
        onAdded={onRefresh}
      />
    </ScrollView>
  );
}
