import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  tabs: string[];
  active: number;
  setActive: (i: number) => void;
  badges?: Record<number, number>;
};

export function TextTabBar({ tabs, active, setActive, badges }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {tabs.map((tab, i) => {
          const badgeCount = badges?.[i] ?? 0;
          return (
            <TouchableOpacity key={tab} onPress={() => setActive(i)} style={styles.tab}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, i === active && styles.activeLabel]}>{tab}</Text>
                {badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount}</Text>
                  </View>
                )}
              </View>
              {i === active && <View style={styles.underline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  container: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 28,
  },
  tab: {
    paddingBottom: 10,
    paddingTop: 4,
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkMid,
  },
  activeLabel: {
    color: colors.ink,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.purple,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  underline: {
    height: 2,
    backgroundColor: colors.purple,
    borderRadius: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
