import { Suspense, type ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import ScreenErrorBoundary from './ScreenErrorBoundary';

function DefaultSkeleton() {
  return (
    <View style={styles.skeleton}>
      <ActivityIndicator size="large" color={colors.purple} />
    </View>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

export default function ScreenSuspense({ children, fallback, onRetry }: Props) {
  return (
    <ScreenErrorBoundary onRetry={onRetry}>
      <Suspense fallback={fallback ?? <DefaultSkeleton />}>{children}</Suspense>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
