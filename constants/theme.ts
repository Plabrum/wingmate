// Raw hex values for escape-hatch use: SVG stroke, dynamic borderColor,
// animated style props, and legacy StyleSheet usage.
// For new static styles, prefer className from @/lib/tw instead.

export const colors = {
  purple:     '#6654D9',
  purplePale: '#EEEAFF',
  purpleSoft: '#D9D4FF',
  ink:        '#18181C',
  inkMid:     '#52525E',
  inkDim:     '#8C8C9E',
  inkGhost:   '#BBBBC8',
  canvas:     '#F7F6F3',
  green:      '#22C55E',
  divider:    '#EBEBF0',
  muted:      '#F1F0EE',
  lavender:   '#E9E6FF',
  white:      '#FFFFFF',
} as const;

// Legacy Fonts — used by onboarding screens for fontFamily in StyleSheet.
// New components should use font-serif / font-sans className instead.
import { Platform } from 'react-native';

export const Fonts = Platform.select({
  ios: { serif: 'ui-serif', sans: 'system-ui' },
  default: { serif: 'serif', sans: 'normal' },
});

// Legacy light/dark Colors used by collapsible.tsx
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};
