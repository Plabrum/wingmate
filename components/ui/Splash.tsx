import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { View, Text } from '@/lib/tw';
import { PearMark } from '@/components/ui/PearMark';

const LEAF = '#5A8C3A';

function PulseDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(0.95, { duration: 600 }), withTiming(0.25, { duration: 600 })),
        -1,
        false
      )
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 5, backgroundColor: LEAF, marginHorizontal: 4 },
        style,
      ]}
    />
  );
}

export default function Splash() {
  return (
    <View className="absolute inset-0 bg-background">
      <View className="absolute" style={{ top: 80, left: -30, opacity: 0.1 }}>
        <View style={{ transform: [{ rotate: '-12deg' }] }}>
          <PearMark size={240} color={LEAF} />
        </View>
      </View>
      <View className="absolute" style={{ bottom: 120, right: -40, opacity: 0.07 }}>
        <View style={{ transform: [{ rotate: '20deg' }] }}>
          <PearMark size={300} color={LEAF} />
        </View>
      </View>
      <View className="absolute" style={{ top: 320, right: 30, opacity: 0.08 }}>
        <PearMark size={80} color={LEAF} />
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <PearMark size={108} />
        <View className="items-center mt-6">
          <Text
            className="text-foreground"
            style={{
              fontFamily: 'DMSerifDisplay',
              fontSize: 64,
              lineHeight: 64,
              letterSpacing: -2,
            }}
          >
            Pear
          </Text>
          <Text
            className="text-foreground-muted mt-2"
            style={{
              fontFamily: 'DMSerifDisplay',
              fontStyle: 'italic',
              fontSize: 18,
              letterSpacing: -0.2,
            }}
          >
            dating, with a second opinion
          </Text>
        </View>
      </View>

      <View
        className="absolute left-0 right-0 flex-row items-center justify-center"
        style={{ bottom: 110 }}
      >
        <PulseDot delay={0} />
        <PulseDot delay={180} />
        <PulseDot delay={360} />
      </View>

      <View className="absolute left-0 right-0" style={{ bottom: 56 }}>
        <Text
          className="text-foreground-subtle text-center"
          style={{ fontSize: 10.5, letterSpacing: 2.4 }}
        >
          A GARDEN, EST. 2026
        </Text>
      </View>
    </View>
  );
}
