import { Text, View } from '@/lib/tw';
import { FaceAvatar } from './FaceAvatar';

export type WingStackItem = {
  name: string;
  photoUri?: string | null;
};

type Props = {
  items: WingStackItem[];
  size?: number;
  max?: number;
  label?: string;
};

const SURFACE_MUTED = '#EDE6D6';
const FOREGROUND_MUTED = '#4A4338';

export function WingStack({ items, size = 28, max = 3, label }: Props) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  const overlap = Math.round(size * 0.32);

  return (
    <View className="flex-row items-center">
      <View className="flex-row">
        {shown.map((item, i) => (
          <View key={i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i }}>
            <FaceAvatar name={item.name} size={size} photoUri={item.photoUri} ring={2} />
          </View>
        ))}
        {extra > 0 ? (
          <View
            className="items-center justify-center"
            style={{
              marginLeft: -overlap,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: SURFACE_MUTED,
              zIndex: shown.length,
            }}
          >
            <Text
              className="font-semibold"
              style={{ fontSize: Math.round(size * 0.36), color: FOREGROUND_MUTED }}
            >
              +{extra}
            </Text>
          </View>
        ) : null}
      </View>
      {label ? (
        <Text className="ml-2 text-[12.5px] font-medium text-fg-subtle">{label}</Text>
      ) : null}
    </View>
  );
}
