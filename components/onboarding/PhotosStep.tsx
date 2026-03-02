import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { View, Text } from '@/lib/tw';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createDatingProfile, getOwnDatingProfile } from '@/queries/profiles';
import { uploadPhoto, insertPhoto, deleteOwnPhoto, getPhotoUrl } from '@/queries/photos';
import { colors, Fonts } from '@/constants/theme';
import { toast } from 'sonner-native';

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

  useEffect(() => {
    if (initialDpId) return; // normal flow — dpId already set by parent
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
    const { data } = await getOwnDatingProfile(userId);
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

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ctx = ImageManipulator.manipulate(asset.uri);
      ctx.resize({ width: 1200 });
      const imageRef = await ctx.renderAsync();
      const saved = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

      const { path, error: uploadError } = await uploadPhoto(
        userId,
        saved.uri,
        `${Date.now()}.jpg`
      );
      if (uploadError) throw uploadError;

      const { error: insertError } = await insertPhoto(localDpId, path, photos.length, null);
      if (insertError) throw insertError;

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
            await deleteOwnPhoto(photo.id, photo.storagePath);
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
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  const disabled = !localDpId || uploading;
  const canAddMore = photos.length < MAX_PHOTOS && !uploading;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Add your photos</Text>
        <Text style={styles.subtitle}>Add at least one so people can see you.</Text>

        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.slot}>
              <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePhoto(photo)}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {uploading && (
            <View style={[styles.slot, styles.uploadingSlot]}>
              <ActivityIndicator color={colors.purple} />
            </View>
          )}

          {canAddMore && (
            <TouchableOpacity
              style={[styles.slot, styles.emptySlot]}
              onPress={handleAddPhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {photos.length === 0 && !uploading && (
          <Text style={styles.emptyHint}>Add at least one photo so people can see you.</Text>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={onNext} style={styles.skipBtn} disabled={disabled}>
            <Text style={[styles.skipText, disabled && styles.textDisabled]}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={onNext}
            disabled={disabled}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: PADDING },
  title: {
    fontFamily: Fonts?.serif ?? 'serif',
    fontSize: 28,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: colors.inkMid, marginBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  uploadingSlot: { backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center' },
  emptySlot: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: { fontSize: 32, color: colors.inkGhost, lineHeight: 36 },
  emptyHint: {
    fontSize: 14,
    color: colors.inkDim,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 24,
  },
  skipBtn: { paddingVertical: 14, paddingRight: 8 },
  skipText: { fontSize: 16, color: colors.inkMid, fontWeight: '500' },
  textDisabled: { opacity: 0.4 },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '600' },
});
