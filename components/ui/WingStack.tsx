import { View } from 'react-native';
import { FaceAvatar } from './FaceAvatar';

const BG_COLORS = ['#D9D4FF', '#C7F2E0', '#FEF3C7', '#FCE7F3', '#DBEAFE'];
const OVERLAP = 10;

type Props = {
  initials: string[];
  size?: number;
};

export function WingStack({ initials, size = 36 }: Props) {
  if (initials.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row' }}>
      {initials.map((init, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -OVERLAP, zIndex: i }}>
          <FaceAvatar initials={init} size={size} bg={BG_COLORS[i % BG_COLORS.length]} />
        </View>
      ))}
    </View>
  );
}
