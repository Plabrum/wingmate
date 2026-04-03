import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { toast } from 'sonner-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useDaterProfile, getDaterProfile } from '@/queries/profiles';
import { uploadPhoto, insertPhoto, getPhotoUrl } from '@/queries/photos';
import { addPromptResponse } from '@/queries/prompts';

import { View, Text, Pressable, ScrollView, SafeAreaView, TextInput } from '@/lib/tw';
import { NavHeader } from '@/components/ui/NavHeader';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { PurpleButton } from '@/components/ui/PurpleButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ScreenSuspense from '@/components/ui/ScreenSuspense';

const PHOTO_COL = (Dimensions.get('window').width - 20 * 2 - 8) / 2;

// ── ResponseModal ─────────────────────────────────────────────────────────────

function ResponseModal({
  visible,
  promptQuestion,
  onSubmit,
  onDismiss,
}: {
  visible: boolean;
  promptQuestion: string;
  onSubmit: (message: string) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit(message.trim());
    setMessage('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View className="flex-1 bg-black/45">
        <Pressable className="flex-1" onPress={onDismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <View
            className="bg-white rounded-t-[20px] px-6 pt-3"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            <View className="self-center w-9 h-1 rounded-full bg-fg-ghost mb-5" />
            <Text className="text-xs font-semibold text-fg-muted uppercase tracking-[0.6px] mb-1">
              Prompt
            </Text>
            <Text className="text-sm font-semibold text-fg mb-4" numberOfLines={2}>
              {promptQuestion}
            </Text>
            <TextInput
              className="border-[1.5px] border-separator rounded-xl px-4 py-[14px] text-sm text-fg bg-white min-h-[100px]"
              placeholder="Write a comment on this prompt..."
              placeholderTextColor={colors.inkGhost}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
              autoFocus
            />
            <View className="mt-4">
              <PurpleButton
                label="Send Comment"
                onPress={handleSubmit}
                disabled={!message.trim()}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── DaterProfileContent ───────────────────────────────────────────────────────

function DaterProfileContent() {
  const router = useRouter();
  const { userId: wingerId } = useAuth();
  const { daterId } = useLocalSearchParams<{ daterId: string }>();
  const queryClient = useQueryClient();

  const { data: daterProfile } = useDaterProfile(daterId);
  const [uploading, setUploading] = useState(false);
  const [respondingToPrompt, setRespondingToPrompt] = useState<{
    id: string;
    question: string;
  } | null>(null);

  const daterName = (daterProfile?.user as any)?.chosen_name ?? 'them';
  const firstName = daterName.split(' ')[0] || daterName;

  const approvedPhotos = (daterProfile?.photos ?? []).filter((p) => p.approved_at !== null);
  const myPendingPhotos = (daterProfile?.photos ?? []).filter(
    (p) => p.approved_at === null && p.suggester_id === wingerId
  );

  const handleSuggestPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      toast.error('Allow photo access in Settings to suggest photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ctx = ImageManipulator.manipulate(asset.uri);
      ctx.resize({ width: 1200 });
      const imageRef = await ctx.renderAsync();
      const saved = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      const filename = `${Date.now()}.jpg`;
      const { path, error: upErr } = await uploadPhoto(wingerId, saved.uri, filename);
      if (upErr) throw upErr;
      const nextOrder = approvedPhotos.length + myPendingPhotos.length;
      const { error: insErr } = await insertPhoto(daterProfile!.id, path, nextOrder, wingerId);
      if (insErr) throw insErr;
      queryClient.invalidateQueries({ queryKey: [getDaterProfile, daterId] });
      toast.success(`Photo suggested — ${firstName} will review it.`);
    } catch {
      toast.error('Failed to suggest photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitResponse = async (message: string) => {
    if (!respondingToPrompt) return;
    const { error } = await addPromptResponse(wingerId, respondingToPrompt.id, message);
    setRespondingToPrompt(null);
    if (error) {
      toast.error("Couldn't send comment. Try again.");
      return;
    }
    toast.success(`Comment sent — ${firstName} will review it.`);
  };

  return (
    <>
      <NavHeader back title={`${firstName}'s Profile`} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-12">
        {/* ── Photos ──────────────────────────────────────────────────────── */}
        <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] px-5 pt-6 pb-[10px]">
          Photos
        </Text>

        {approvedPhotos.length === 0 && myPendingPhotos.length === 0 ? (
          <Text className="text-sm text-fg-muted px-5 mb-4">No photos yet.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2 px-5 mb-4">
            {approvedPhotos.map((photo) => (
              <View key={photo.id} style={{ width: PHOTO_COL }}>
                <PhotoRect uri={getPhotoUrl(photo.storage_url)} ratio={4 / 5} />
              </View>
            ))}
            {myPendingPhotos.map((photo) => (
              <View key={photo.id} style={{ width: PHOTO_COL, position: 'relative' }}>
                <PhotoRect uri={getPhotoUrl(photo.storage_url)} ratio={4 / 5} blur />
                <View className="absolute bottom-2 left-0 right-0 items-center">
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                  >
                    <Text className="text-white text-xs font-semibold">Pending approval</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          className="flex-row items-center justify-center gap-2 mx-5 border-[1.5px] border-accent border-dashed rounded-xl py-[14px] min-h-[52px]"
          onPress={handleSuggestPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.purple} size="small" />
          ) : (
            <>
              <IconSymbol name="plus" size={18} color={colors.purple} />
              <Text className="text-sm font-semibold text-accent">Suggest a Photo</Text>
            </>
          )}
        </Pressable>

        {/* ── Prompts ─────────────────────────────────────────────────────── */}
        <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] px-5 pt-6 pb-[10px]">
          Prompts
        </Text>

        {(daterProfile?.prompts ?? []).length === 0 ? (
          <Text className="text-sm text-fg-muted px-5">
            {firstName} hasn{"'"}t added any prompts yet.
          </Text>
        ) : (
          <View className="px-5 gap-3">
            {(daterProfile?.prompts ?? []).map((prompt) => {
              const question = (prompt.template as any)?.question ?? '';
              return (
                <View key={prompt.id} className="bg-white rounded-xl p-4">
                  <Text className="text-sm font-semibold text-accent mb-1.5">{question}</Text>
                  <Text className="text-base text-fg leading-[22px] font-serif">
                    {prompt.answer}
                  </Text>
                  <Pressable
                    className="mt-3 pt-3 flex-row items-center gap-1.5"
                    style={{
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.divider,
                    }}
                    onPress={() => setRespondingToPrompt({ id: prompt.id, question })}
                  >
                    <IconSymbol name="bubble.left" size={14} color={colors.purple} />
                    <Text className="text-sm font-semibold text-accent">Add Comment</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ResponseModal
        visible={respondingToPrompt !== null}
        promptQuestion={respondingToPrompt?.question ?? ''}
        onSubmit={handleSubmitResponse}
        onDismiss={() => setRespondingToPrompt(null)}
      />
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DaterProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <ScreenSuspense>
        <DaterProfileContent />
      </ScreenSuspense>
    </SafeAreaView>
  );
}
