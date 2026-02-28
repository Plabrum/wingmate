import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  tabs: string[];
  active: number;
  setActive: (i: number) => void;
};

export function TextTabBar({ tabs, active, setActive }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {tabs.map((tab, i) => (
          <TouchableOpacity key={tab} onPress={() => setActive(i)} style={styles.tab}>
            <Text style={[styles.label, i === active && styles.activeLabel]}>{tab}</Text>
            {i === active && <View style={styles.underline} />}
          </TouchableOpacity>
        ))}
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
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkMid,
  },
  activeLabel: {
    color: colors.ink,
    fontWeight: '600',
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
