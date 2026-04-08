import { View } from '@/lib/tw';
import { FaceAvatar } from './FaceAvatar';

// Matches --color-avatar-* tokens in global.css
const BG_COLORS = ['#D9D4FF', '#C7F2E0', '#FEF3C7', '#FCE7F3', '#DBEAFE'];
const OVERLAP = 10;

export type WingStackItem = {
  initials: string;
  photoUri?: string | null;
};

type Props = {
  items: WingStackItem[];
  size?: number;
};

export function WingStack({ items, size = 36 }: Props) {
  if (items.length === 0) return null;
  return (
    <View className="flex-row">
      {items.map((item, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -OVERLAP, zIndex: i }}>
          <FaceAvatar
            initials={item.initials}
            size={size}
            bg={BG_COLORS[i % BG_COLORS.length]}
            photoUri={item.photoUri}
          />
        </View>
      ))}
    </View>
  );
}
