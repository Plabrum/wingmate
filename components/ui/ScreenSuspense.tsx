import { Suspense, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PulseSpinner from '@/components/ui/PulseSpinner';
import ScreenErrorBoundary from './ScreenErrorBoundary';

function DefaultSkeleton() {
  return (
    <View style={styles.skeleton}>
      <PulseSpinner />
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
