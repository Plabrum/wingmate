import { View } from '@/lib/tw';
import { Image } from 'expo-image';

type Props = {
  uri: string | null;
  ratio?: number;
  blur?: boolean;
  style?: object;
};

export function PhotoRect({ uri, ratio = 4 / 5, blur = false, style }: Props) {
  return (
    <View className="bg-surface overflow-hidden rounded-xl" style={[{ aspectRatio: ratio }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          contentFit="cover"
          blurRadius={blur ? 20 : 0}
          transition={200}
        />
      ) : (
        <View className="absolute inset-0 bg-separator" />
      )}
    </View>
  );
}
