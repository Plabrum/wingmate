import { StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';
import { View, Text, ScrollView, SafeAreaView } from '@/lib/tw';
import ScreenSuspense from '@/components/ui/ScreenSuspense';
import { useGetApiWingerActivitySuspense } from '@/lib/api/generated/winger-activity/winger-activity';
import type { ActivityRow } from '@/lib/api/generated/model';

function formatRelativeTime(iso: string): string {
  const then = new Date(iso.replace(' ', 'T')).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days`;
  if (days < 14) return 'last week';
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} weeks`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

function rowText(row: ActivityRow): string {
  switch (row.kind) {
    case 'match':
      return 'Your pick became a match.';
    case 'pass':
      return `Passed on your suggestion${row.recipientName ? ` of ${row.recipientName}` : ''}.`;
    case 'sent':
      return `You suggested ${row.recipientName ?? 'someone'} — pending review.`;
    case 'reply':
      return row.message ?? 'You replied to a prompt.';
  }
}

function ActivityRowItem({ row }: { row: ActivityRow }) {
  const muted = row.kind === 'pass';
  return (
    <View
      className="bg-white rounded-2xl px-3.5 py-3"
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.divider,
        opacity: muted ? 0.7 : 1,
      }}
    >
      <Text className="text-sm text-ink" style={{ lineHeight: 20 }}>
        <Text className="font-semibold text-ink">{row.daterName}</Text>
        {row.recipientName ? (
          <Text className="text-ink-mid">{` · ${row.recipientName}`}</Text>
        ) : null}
        {row.kind === 'reply' && row.promptQuestion ? (
          <Text className="text-ink-mid">{` · ${row.promptQuestion}`}</Text>
        ) : null}
      </Text>
      <Text className="text-sm mt-1 text-ink-mid" style={{ lineHeight: 20 }}>
        {rowText(row)}
      </Text>
      <Text className="text-xs mt-1.5 text-ink-dim">{formatRelativeTime(row.createdAt)}</Text>
    </View>
  );
}

function ActivityContent() {
  const { data } = useGetApiWingerActivitySuspense();

  return (
    <ScrollView contentContainerClassName="pb-32">
      <View className="px-4 pt-2 pb-1">
        <Text className="font-serif text-ink" style={{ fontSize: 28, letterSpacing: -0.5 }}>
          Activity
        </Text>
      </View>
      <Text className="px-4 pb-3 text-sm text-ink-dim">What came of your picks.</Text>

      {data.length === 0 ? (
        <View
          className="mx-4 mt-2 p-5 rounded-2xl bg-accent-muted"
          style={{ borderWidth: 1, borderColor: 'rgba(90,140,58,0.13)' }}
        >
          <Text className="text-xs uppercase mb-2 text-primary" style={{ letterSpacing: 1.4 }}>
            Nothing yet
          </Text>
          <Text
            className="font-serif text-ink"
            style={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.3 }}
          >
            Your picks, replies, and matches will land here.
          </Text>
          <Text className="text-sm mt-2 text-ink-mid" style={{ lineHeight: 20 }}>
            Head to Scout to send a pick or jump into Friends to add a prompt reply.
          </Text>
        </View>
      ) : (
        <View className="px-4" style={{ gap: 8 }}>
          {data.map((row) => (
            <ActivityRowItem key={row.id} row={row} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default function ActivityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <ScreenSuspense>
        <ActivityContent />
      </ScreenSuspense>
    </SafeAreaView>
  );
}
