import { View, Text, ScrollView, SafeAreaView } from '@/lib/tw';

export default function ActivityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <ScrollView contentContainerClassName="pb-32">
        <View className="px-4 pt-2 pb-1">
          <Text className="font-serif text-ink" style={{ fontSize: 28, letterSpacing: -0.5 }}>
            Activity
          </Text>
        </View>
        <Text className="px-4 pb-3 text-sm text-ink-dim">What came of your picks.</Text>

        <View
          className="mx-4 mt-2 p-5 rounded-2xl bg-accent-muted"
          style={{ borderWidth: 1, borderColor: 'rgba(90,140,58,0.13)' }}
        >
          <Text className="text-xs uppercase mb-2 text-purple" style={{ letterSpacing: 1.4 }}>
            Coming soon
          </Text>
          <Text
            className="font-serif text-ink"
            style={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.3 }}
          >
            Your picks, replies, and matches will land here.
          </Text>
          <Text className="text-sm mt-2 text-ink-mid" style={{ lineHeight: 20 }}>
            We{"'"}re wiring up the activity feed — for now, jump into Scout to send picks or check
            Friends for new invitations.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
