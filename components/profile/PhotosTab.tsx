import { Alert, ActivityIndicator, Dimensions } from 'react-native';
import { toast } from 'sonner-native';
import type { UseFormReturn } from 'react-hook-form';

import { colors } from '@/constants/theme';
import type { OwnDatingProfile } from '@/hooks/use-profile';
import { useUploadProfilePhoto } from '@/hooks/use-upload-profile-photo';
import { getPhotoUrl, pickAndResizePhoto, removePhotoStorage } from '@/lib/photos';
import {
  patchApiPhotosIdReorder,
  postApiPhotosIdApprove,
  postApiPhotosIdReject,
} from '@/lib/api/generated/photos/photos';

import { ScrollView, Text, Pressable, View } from '@/lib/tw';
import { PhotoRect } from '@/components/ui/PhotoRect';
import { IconSymbol } from '@/components/ui/icon-symbol';

const PHOTO_COL = (Dimensions.get('window').width - 20 * 2 - 8) / 2;

interface Props {
  form: UseFormReturn<OwnDatingProfile>;
  data: OwnDatingProfile;
  onRefresh: () => Promise<void>;
}

export function PhotosTab({ form, data, onRefresh }: Props) {
  const { upload, isPending: uploading } = useUploadProfilePhoto();

  const photos = form.watch('photos');
  const selfPhotos = photos.filter((p) => p.suggester_id === null && p.approved_at !== null);
  const pending = photos.filter((p) => p.suggester_id !== null && p.approved_at === null);

  const handleApprove = async (photoId: string) => {
    const prev = photos;
    const now = new Date().toISOString();
    form.setValue(
      'photos',
      photos.map((p) => (p.id === photoId ? { ...p, approved_at: now } : p))
    );
    try {
      await postApiPhotosIdApprove(photoId);
    } catch {
      form.setValue('photos', prev);
      toast.error('Could not approve photo.');
    }
  };

  const handleReject = async (photoId: string, storagePath: string) => {
    const prev = photos;
    form.setValue(
      'photos',
      photos.filter((p) => p.id !== photoId)
    );
    try {
      await postApiPhotosIdReject(photoId);
      await removePhotoStorage(storagePath);
    } catch {
      form.setValue('photos', prev);
      toast.error('Could not reject photo.');
    }
  };

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const updated = [...selfPhotos];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    const payload = updated.map((p, i) => ({ id: p.id, display_order: i }));
    const prev = photos;
    form.setValue('photos', [...updated.map((p, i) => ({ ...p, display_order: i })), ...pending]);
    try {
      await Promise.all(
        payload.map(({ id, display_order }) =>
          patchApiPhotosIdReorder(id, { displayOrder: display_order })
        )
      );
      onRefresh();
    } catch {
      form.setValue('photos', prev);
      toast.error('Could not reorder photos.');
    }
  };

  const handleDelete = (idx: number) => {
    const photo = selfPhotos[idx];
    Alert.alert('Delete Photo', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const prev = photos;
          form.setValue(
            'photos',
            photos.filter((p) => p.id !== photo.id)
          );
          try {
            await postApiPhotosIdReject(photo.id);
            await removePhotoStorage(photo.storage_url);
          } catch {
            form.setValue('photos', prev);
            toast.error('Could not delete photo.');
          }
        },
      },
    ]);
  };

  const handleAddPhoto = async () => {
    const uri = await pickAndResizePhoto();
    if (!uri) return;
    const ok = await upload(data.id, uri, `${Date.now()}.jpg`, selfPhotos.length);
    if (ok) await onRefresh();
  };

  return (
    <ScrollView contentContainerClassName="p-5 pb-12" showsVerticalScrollIndicator={false}>
      {pending.length > 0 && (
        <>
          <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mb-[10px] mt-1">
            Suggested by Wingpeople
          </Text>
          {pending.map((photo) => {
            const suggesterName = (photo as any).suggester?.chosen_name ?? 'your wingperson';
            return (
              <View key={photo.id} className="bg-white rounded-xl overflow-hidden mb-3">
                <PhotoRect
                  uri={getPhotoUrl(photo.storage_url)}
                  ratio={4 / 3}
                  blur
                  style={{ borderRadius: 0 }}
                />
                <View className="p-3">
                  <Text className="text-sm font-semibold text-fg">From {suggesterName}</Text>
                  <Text className="text-sm text-fg-muted mt-0.5">
                    Approve to add this to your profile.
                  </Text>
                </View>
                <View className="flex-row gap-2 px-3 pb-3">
                  <Pressable
                    className="flex-1 py-[10px] rounded-lg items-center bg-accent"
                    onPress={() => handleApprove(photo.id)}
                  >
                    <Text className="text-white font-semibold text-sm">Approve</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 py-[10px] rounded-lg items-center bg-surface"
                    onPress={() => handleReject(photo.id, photo.storage_url)}
                  >
                    <Text className="text-fg font-semibold text-sm">Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text className="text-xs font-bold text-fg-subtle uppercase tracking-[0.6px] mb-[10px] mt-1">
        My Photos{selfPhotos.length > 0 ? ` (${selfPhotos.length})` : ''}
      </Text>

      {selfPhotos.length === 0 ? (
        <View className="bg-white rounded-xl p-7 items-center mb-4">
          <Text className="text-sm font-semibold text-fg">No photos yet.</Text>
          <Text className="text-sm text-fg-muted mt-1.5 text-center">
            Add at least one so people can see you.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {selfPhotos.map((photo, idx) => (
            <View key={photo.id} style={{ width: PHOTO_COL, position: 'relative' }}>
              <PhotoRect uri={getPhotoUrl(photo.storage_url)} ratio={4 / 5} />
              {idx === 0 && (
                <View className="absolute top-2 left-2 bg-accent rounded-md px-[7px] py-[3px]">
                  <Text className="text-white text-xs font-semibold">Primary</Text>
                </View>
              )}
              {idx !== 0 && (
                <Pressable
                  className="absolute top-2 left-2 rounded-lg p-[5px]"
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                  onPress={() => handleMoveUp(idx)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <IconSymbol name="arrow.up" size={13} color={colors.white} />
                </Pressable>
              )}
              <Pressable
                className="absolute top-2 right-2 rounded-full w-[24px] h-[24px] items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                onPress={() => handleDelete(idx)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <IconSymbol name="xmark" size={12} color={colors.white} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        className="flex-row items-center justify-center gap-2 border-[1.5px] border-accent border-dashed rounded-xl py-[14px] mt-4 min-h-[52px]"
        onPress={handleAddPhoto}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.purple} size="small" />
        ) : (
          <>
            <IconSymbol name="plus" size={18} color={colors.purple} />
            <Text className="text-sm font-semibold text-accent">Add Photo</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
