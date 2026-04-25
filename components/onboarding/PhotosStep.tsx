import { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, Dimensions } from 'react-native';
import { View, Text, SafeAreaView, Pressable } from '@/lib/tw';
import { Image } from 'expo-image';
import { createDatingProfile, getOwnDatingProfileSnapshot } from '@/hooks/use-profile';
import { getPhotoUrl, pickAndResizePhoto, removePhotoStorage, uploadPhoto } from '@/queries/photos';
import { postApiPhotos, postApiPhotosIdReject } from '@/lib/api/generated/photos/photos';
import { colors } from '@/constants/theme';
import { toast } from 'sonner-native';
import { cn } from '@/lib/cn';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING = 24;
const GAP = 10;
const SLOT_SIZE = Math.floor((SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3);
const MAX_PHOTOS = 6;

type LocalPhoto = { id: string; uri: string; storagePath: string };

type Props = {
  userId: string;
  /** Already-set dpId from normal flow; null only when resuming after an app kill */
  dpId: string | null;
  onDpCreated: (id: string) => void;
  onNext: () => void;
};

export default function PhotosStep({ userId, dpId: initialDpId, onDpCreated, onNext }: Props) {
  const [localDpId, setLocalDpId] = useState(initialDpId);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  // Only true when app was killed mid-flow and we need to (re)create the dating profile
  const [initializing, setInitializing] = useState(!initialDpId);

  // mount-only guard — genuine app-kill-resume case where dating-profile creation
  // was interrupted before completing; CLAUDE.md explicitly allows this exception.
  useEffect(() => {
    if (initialDpId) return;
    createDatingProfile({
      user_id: userId,
      city: 'Boston',
      age_from: 18,
      interested_gender: [],
      religion: 'Prefer not to say',
      interests: [],
      dating_status: 'open',
    }).then(({ data: dp, error: dpError }) => {
      if (dpError || !dp) {
        toast.error('Could not set up your profile. Please try again.');
      } else {
        setLocalDpId(dp.id);
        onDpCreated(dp.id);
      }
      setInitializing(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPhotos() {
    const { data } = await getOwnDatingProfileSnapshot();
    if (data) {
      setPhotos(
        data.photos.map((p) => ({
          id: p.id,
          uri: getPhotoUrl(p.storage_url),
          storagePath: p.storage_url,
        }))
      );
    }
  }

  async function handleAddPhoto() {
    if (photos.length >= MAX_PHOTOS || !localDpId) return;

    const uri = await pickAndResizePhoto();
    if (!uri) return;

    setUploading(true);
    try {
      const { path, error: uploadError } = await uploadPhoto(userId, uri, `${Date.now()}.jpg`);
      if (uploadError) throw uploadError;

      await postApiPhotos({
        datingProfileId: localDpId,
        storageUrl: path,
        displayOrder: photos.length,
      });

      await refreshPhotos();
    } catch {
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photo: LocalPhoto) {
    Alert.alert('Remove photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const previous = photos;
          setPhotos((p) => p.filter((x) => x.id !== photo.id));
          try {
            await postApiPhotosIdReject(photo.id);
            await removePhotoStorage(photo.storagePath);
          } catch {
            setPhotos(previous);
            toast.error('Failed to remove photo. Please try again.');
          }
        },
      },
    ]);
  }

  if (initializing) {
    return (
      <SafeAreaView className="flex-1 bg-page justify-center items-center">
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  const disabled = !localDpId || uploading;
  const canAddMore = photos.length < MAX_PHOTOS && !uploading;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 p-6">
        <Text className="font-serif text-3xl font-semibold text-fg mb-2">Add your photos</Text>
        <Text className="text-sm text-fg-muted mb-7">Add at least one so people can see you.</Text>

        <View className="flex-row flex-wrap gap-2.5">
          {photos.map((photo) => (
            <View
              key={photo.id}
              className="rounded-xl overflow-hidden relative"
              style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
            >
              <Image
                source={{ uri: photo.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              <Pressable
                className="absolute top-1.5 right-1.5 rounded-xl w-6 h-6 justify-center items-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
                onPress={() => handleDeletePhoto(photo)}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              >
                <Text className="text-white text-xs font-bold">✕</Text>
              </Pressable>
            </View>
          ))}

          {uploading && (
            <View
              className="rounded-xl overflow-hidden relative bg-surface justify-center items-center"
              style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
            >
              <ActivityIndicator color={colors.purple} />
            </View>
          )}

          {canAddMore && (
            <Pressable
              className="rounded-xl overflow-hidden relative bg-white border-[1.5px] border-separator border-dashed justify-center items-center"
              style={{ width: SLOT_SIZE, height: SLOT_SIZE }}
              onPress={handleAddPhoto}
            >
              <Text className="text-4xl text-fg-ghost leading-9">+</Text>
            </Pressable>
          )}
        </View>

        {photos.length === 0 && !uploading && (
          <Text className="text-sm text-fg-subtle text-center mt-6 leading-5">
            Add at least one photo so people can see you.
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-auto pt-6">
          <Pressable className="py-[14px] pr-2" onPress={onNext} disabled={disabled}>
            <Text className={cn('text-base text-fg-muted font-medium', disabled && 'opacity-40')}>
              Skip
            </Text>
          </Pressable>
          <Pressable
            className={cn(
              'bg-accent rounded-xl py-[14px] px-8 items-center',
              disabled && 'opacity-40'
            )}
            onPress={onNext}
            disabled={disabled}
          >
            <Text className="text-white text-base font-semibold">Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
