import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { OwnDatingProfile } from '@/queries/profiles';
import {
  approvePromptResponse,
  rejectPromptResponse,
  deleteProfilePrompt,
} from '@/queries/prompts';

import { FaceAvatar } from '@/components/ui/FaceAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AddPromptModal } from './AddPromptModal';
import { getInitials, type OptimisticHandlers } from './profile-helpers';

interface Props extends OptimisticHandlers {
  data: OwnDatingProfile;
  onRefresh: () => void;
}

export function PromptsTab({ data, onOptimistic, onRollback, onError, onRefresh }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const usedTemplateIds = new Set(data.prompts.map((p) => p.template.id));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleApproveResponse = async (promptId: string, responseId: string) => {
    const prev = data.prompts;
    onOptimistic({
      prompts: data.prompts.map((p) =>
        p.id === promptId
          ? {
              ...p,
              responses: p.responses.map((r) =>
                r.id === responseId ? { ...r, is_approved: true } : r
              ),
            }
          : p
      ),
    });
    try {
      const { error } = await approvePromptResponse(responseId);
      if (error) throw error;
    } catch {
      onRollback({ prompts: prev });
      onError('Could not approve comment.');
    }
  };

  const handleRejectResponse = async (promptId: string, responseId: string) => {
    const prev = data.prompts;
    onOptimistic({
      prompts: data.prompts.map((p) =>
        p.id === promptId
          ? { ...p, responses: p.responses.filter((r) => r.id !== responseId) }
          : p
      ),
    });
    try {
      const { error } = await rejectPromptResponse(responseId);
      if (error) throw error;
    } catch {
      onRollback({ prompts: prev });
      onError('Could not reject comment.');
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    const prev = data.prompts;
    onOptimistic({ prompts: data.prompts.filter((p) => p.id !== promptId) });
    try {
      const { error } = await deleteProfilePrompt(promptId);
      if (error) throw error;
    } catch {
      onRollback({ prompts: prev });
      onError('Could not remove prompt.');
    }
  };

  return (
    <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      {data.prompts.length === 0 && (
        <View style={st.emptyBox}>
          <Text style={st.emptyTitle}>No prompts yet.</Text>
          <Text style={st.emptySub}>Add one to give people something to connect with.</Text>
        </View>
      )}

      {data.prompts.map((prompt) => {
        const pendingR = prompt.responses.filter((r) => !r.is_approved);
        const approvedR = prompt.responses.filter((r) => r.is_approved);
        const isExpanded = expanded.has(prompt.id);

        return (
          <View key={prompt.id} style={st.card}>
            <Text style={st.question}>{prompt.template.question}</Text>
            <Text style={st.answer}>{prompt.answer}</Text>

            {/* Approved wing comments */}
            {approvedR.map((r) => (
              <View key={r.id} style={st.approvedRow}>
                { }
                <FaceAvatar initials={getInitials((r as any).author?.chosen_name)} size={28} />
                <View style={st.flex1}>
                  { }
                  <Text style={st.commentAuthor}>{(r as any).author?.chosen_name ?? 'Wingperson'}</Text>
                  <Text style={st.commentText}>{r.message}</Text>
                </View>
              </View>
            ))}

            {/* Pending responses */}
            {pendingR.length > 0 && (
              <>
                <TouchableOpacity
                  style={st.pendingToggle}
                  onPress={() => toggle(prompt.id)}
                >
                  <Text style={st.pendingToggleTxt}>
                    {pendingR.length} wingperson comment{pendingR.length > 1 ? 's' : ''} waiting
                  </Text>
                  <IconSymbol
                    name={isExpanded ? 'chevron.up' : 'chevron.down'}
                    size={13}
                    color={colors.purple}
                  />
                </TouchableOpacity>
                {isExpanded &&
                  pendingR.map((r) => (
                    <View key={r.id} style={st.pendingResponseRow}>
                      { }
                      <FaceAvatar initials={getInitials((r as any).author?.chosen_name)} size={28} />
                      <View style={st.flex1}>
                        <Text style={st.commentText}>{r.message}</Text>
                        <View style={st.responseActions}>
                          <TouchableOpacity
                            style={[st.respBtn, st.approveRespBtn]}
                            onPress={() => handleApproveResponse(prompt.id, r.id)}
                          >
                            <Text style={st.approveRespTxt}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[st.respBtn, st.rejectRespBtn]}
                            onPress={() => handleRejectResponse(prompt.id, r.id)}
                          >
                            <Text style={st.rejectRespTxt}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
              </>
            )}

            {/* Delete prompt */}
            <TouchableOpacity
              style={st.deleteRow}
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
              <Text style={st.deleteTxt}>Remove prompt</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={st.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.75}>
        <IconSymbol name="plus" size={18} color={colors.purple} />
        <Text style={st.addBtnTxt}>Add Prompt</Text>
      </TouchableOpacity>

      <AddPromptModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        usedTemplateIds={usedTemplateIds}
        datingProfileId={data.id}
        onAdded={onRefresh}
      />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  flex1: { flex: 1 },
  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  emptySub: { fontSize: 13, color: colors.inkMid, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 14 },
  question: { fontSize: 13, fontWeight: '600', color: colors.purple, marginBottom: 6 },
  answer: { fontSize: 16, color: colors.ink, lineHeight: 22, fontFamily: 'Georgia' },
  approvedRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  commentAuthor: { fontSize: 12, fontWeight: '600', color: colors.inkMid, marginBottom: 3 },
  commentText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  pendingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  pendingToggleTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.purple },
  pendingResponseRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  responseActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  respBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  approveRespBtn: { backgroundColor: colors.purple },
  approveRespTxt: { color: colors.white, fontSize: 13, fontWeight: '600' },
  rejectRespBtn: { backgroundColor: colors.muted },
  rejectRespTxt: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  deleteRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  deleteTxt: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  addBtnTxt: { fontSize: 15, fontWeight: '600', color: colors.purple },
});
