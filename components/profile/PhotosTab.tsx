import { ActivityIndicator, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useState } from 'react';

import { colors } from '@/constants/theme';
import type { OwnDatingProfile } from '@/queries/profiles';
import {
  approvePhoto,
  rejectPhoto,
  uploadPhoto,
  insertPhoto,
  getPhotoUrl,
  reorderPhotos,
} from '@/queries/photos';

import { ScrollView, Text, Pressable, View } from '@/lib/tw';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { OptimisticHandlers } from './profile-helpers';

const PHOTO_COL = (Dimensions.get('window').width - 20 * 2 - 8) / 2;

interface Props extends OptimisticHandlers {
  data: OwnDatingProfile;
  userId: string;
  onRefresh: () => Promise<void>;
}

export function PhotosTab({ data, userId, onOptimistic, onRollback, onError, onRefresh }: Props) {
  const [uploading, setUploading] = useState(false);

  const selfPhotos = data.photos.filter((p) => p.suggester_id === null && p.approved_at !== null);
  const pending = data.photos.filter((p) => p.suggester_id !== null && p.approved_at === null);

  const handleApprove = async (photoId: string) => {
    const prev = data.photos;
    const now = new Date().toISOString();
    onOptimistic({
      photos: data.photos.map((p) => (p.id === photoId ? { ...p, approved_at: now } : p)),
    });
    try {
      const { error } = await approvePhoto(photoId);
      if (error) throw error;
    } catch {
      onRollback({ photos: prev });
      onError('Could not approve photo.');
    }
  };

  const handleReject = async (photoId: string, storagePath: string) => {
    const prev = data.photos;
    onOptimistic({ photos: data.photos.filter((p) => p.id !== photoId) });
    try {
      const { dbResult } = await rejectPhoto(photoId, storagePath);
      if (dbResult.error) throw dbResult.error;
    } catch {
      onRollback({ photos: prev });
      onError('Could not reject photo.');
    }
  };

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const updated = [...selfPhotos];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    const payload = updated.map((p, i) => ({ id: p.id, display_order: i }));
    const prev = data.photos;
    onOptimistic({ photos: [...updated.map((p, i) => ({ ...p, display_order: i })), ...pending] });
    try {
      await reorderPhotos(payload);
      onRefresh();
    } catch {
      onRollback({ photos: prev });
      onError('Could not reorder photos.');
    }
  };

  const handleAddPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      onError('Allow photo access in Settings to add photos.');
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
      const { path, error: upErr } = await uploadPhoto(userId, saved.uri, filename);
      if (upErr) throw upErr;
      const { error: insErr } = await insertPhoto(data.id, path, selfPhotos.length, null);
      if (insErr) throw insErr;
      await onRefresh();
    } catch {
      onError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerClassName="p-5 pb-12" showsVerticalScrollIndicator={false}>
      {pending.length > 0 && (
        <>
          <Text className="text-12 font-bold text-ink-dim uppercase tracking-[0.6px] mb-[10px] mt-1">
            Suggested by Wingpeople
          </Text>
          {pending.map((photo) => {
            const suggesterName = (photo as any).suggester?.chosen_name ?? 'your wingperson';
            return (
              <View key={photo.id} className="bg-white rounded-14 overflow-hidden mb-3">
                <PhotoRect
                  uri={getPhotoUrl(photo.storage_url)}
                  ratio={4 / 3}
                  blur
                  style={{ borderRadius: 0 }}
                />
                <View className="p-3">
                  <Text className="text-15 font-semibold text-ink">From {suggesterName}</Text>
                  <Text className="text-13 text-ink-mid mt-0.5">
                    Approve to add this to your profile.
                  </Text>
                </View>
                <View className="flex-row gap-2 px-3 pb-3">
                  <Pressable
                    className="flex-1 py-[10px] rounded-[10px] items-center bg-purple"
                    onPress={() => handleApprove(photo.id)}
                  >
                    <Text className="text-white font-semibold text-14">Approve</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 py-[10px] rounded-[10px] items-center bg-muted"
                    onPress={() => handleReject(photo.id, photo.storage_url)}
                  >
                    <Text className="text-ink font-semibold text-14">Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text className="text-12 font-bold text-ink-dim uppercase tracking-[0.6px] mb-[10px] mt-1">
        My Photos{selfPhotos.length > 0 ? ` (${selfPhotos.length})` : ''}
      </Text>

      {selfPhotos.length === 0 ? (
        <View className="bg-white rounded-14 p-7 items-center mb-4">
          <Text className="text-15 font-semibold text-ink">No photos yet.</Text>
          <Text className="text-13 text-ink-mid mt-1.5 text-center">
            Add at least one so people can see you.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {selfPhotos.map((photo, idx) => (
            <View key={photo.id} style={{ width: PHOTO_COL, position: 'relative' }}>
              <PhotoRect uri={getPhotoUrl(photo.storage_url)} ratio={4 / 5} />
              {idx === 0 ? (
                <View className="absolute top-2 left-2 bg-purple rounded-md px-[7px] py-[3px]">
                  <Text className="text-white text-11 font-semibold">Primary</Text>
                </View>
              ) : (
                <Pressable
                  className="absolute top-2 left-2 rounded-lg p-[5px]"
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                  onPress={() => handleMoveUp(idx)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <IconSymbol name="arrow.up" size={13} color={colors.white} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <Pressable
        className="flex-row items-center justify-center gap-2 border-[1.5px] border-purple border-dashed rounded-14 py-[14px] mt-4 min-h-[52px]"
        onPress={handleAddPhoto}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.purple} size="small" />
        ) : (
          <>
            <IconSymbol name="plus" size={18} color={colors.purple} />
            <Text className="text-15 font-semibold text-purple">Add Photo</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
