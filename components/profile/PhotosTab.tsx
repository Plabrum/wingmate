import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useState } from 'react';

import { colors } from '@/constants/theme';
import type { OwnDatingProfile } from '@/queries/profiles';
import { approvePhoto, rejectPhoto, uploadPhoto, insertPhoto, getPhotoUrl, reorderPhotos } from '@/queries/photos';

import { PhotoRect } from '@/components/ui/PhotoRect';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { OptimisticHandlers } from './profile-helpers';

const PHOTO_COL = (Dimensions.get('window').width - 20 * 2 - 8) / 2;

interface Props extends OptimisticHandlers {
  data: OwnDatingProfile;
  userId: string;
  onRefresh: () => void;
}

export function PhotosTab({ data, userId, onOptimistic, onRollback, onError, onRefresh }: Props) {
  const [uploading, setUploading] = useState(false);

  const selfPhotos = data.photos.filter(
    (p) => p.suggester_id === null && p.approved_at !== null
  );
  const pending = data.photos.filter(
    (p) => p.suggester_id !== null && p.approved_at === null
  );

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
      const { uri } = result.assets[0];
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      const res = await fetch(compressed.uri);
      const blob = await res.blob();
      const filename = `${Date.now()}.jpg`;
      const { path, error: upErr } = await uploadPhoto(userId, blob, filename);
      if (upErr) throw upErr;
      const { error: insErr } = await insertPhoto(data.id, path, selfPhotos.length, null);
      if (insErr) throw insErr;
      onRefresh();
    } catch {
      onError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      {pending.length > 0 && (
        <>
          <Text style={st.sectionLabel}>Suggested by Wingpeople</Text>
          {pending.map((photo) => {
             
            const suggesterName = (photo as any).suggester?.chosen_name ?? 'your wingperson';
            return (
              <View key={photo.id} style={st.pendingCard}>
                <PhotoRect
                  uri={getPhotoUrl(photo.storage_url)}
                  ratio={4 / 3}
                  blur
                  style={st.pendingPhotoOverride}
                />
                <View style={st.pendingMeta}>
                  <Text style={st.pendingName}>From {suggesterName}</Text>
                  <Text style={st.pendingHint}>Approve to add this to your profile.</Text>
                </View>
                <View style={st.pendingActions}>
                  <TouchableOpacity
                    style={[st.actionBtn, st.approveBtn]}
                    onPress={() => handleApprove(photo.id)}
                  >
                    <Text style={st.approveTxt}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[st.actionBtn, st.rejectBtn]}
                    onPress={() => handleReject(photo.id, photo.storage_url)}
                  >
                    <Text style={st.rejectTxt}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text style={st.sectionLabel}>
        My Photos{selfPhotos.length > 0 ? ` (${selfPhotos.length})` : ''}
      </Text>

      {selfPhotos.length === 0 ? (
        <View style={st.emptyBox}>
          <Text style={st.emptyTitle}>No photos yet.</Text>
          <Text style={st.emptySub}>Add at least one so people can see you.</Text>
        </View>
      ) : (
        <View style={st.grid}>
          {selfPhotos.map((photo, idx) => (
            <View key={photo.id} style={st.photoWrap}>
              <PhotoRect uri={getPhotoUrl(photo.storage_url)} ratio={4 / 5} />
              {idx === 0 ? (
                <View style={st.primaryBadge}>
                  <Text style={st.primaryBadgeTxt}>Primary</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={st.moveBtn}
                  onPress={() => handleMoveUp(idx)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <IconSymbol name="arrow.up" size={13} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={st.addBtn}
        onPress={handleAddPhoto}
        disabled={uploading}
        activeOpacity={0.75}
      >
        {uploading ? (
          <ActivityIndicator color={colors.purple} size="small" />
        ) : (
          <>
            <IconSymbol name="plus" size={18} color={colors.purple} />
            <Text style={st.addBtnTxt}>Add Photo</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  pendingCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pendingPhotoOverride: { borderRadius: 0 },
  pendingMeta: { padding: 12 },
  pendingName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  pendingHint: { fontSize: 13, color: colors.inkMid, marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: colors.purple },
  approveTxt: { color: colors.white, fontWeight: '600', fontSize: 14 },
  rejectBtn: { backgroundColor: colors.muted },
  rejectTxt: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { width: PHOTO_COL, position: 'relative' },
  moveBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    padding: 5,
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.purple,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  primaryBadgeTxt: { color: colors.white, fontSize: 11, fontWeight: '600' },
  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  emptySub: { fontSize: 13, color: colors.inkMid, marginTop: 6, textAlign: 'center' },
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
    marginTop: 16,
    minHeight: 52,
  },
  addBtnTxt: { fontSize: 15, fontWeight: '600', color: colors.purple },
});
