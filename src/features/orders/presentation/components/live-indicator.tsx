import { View } from 'react-native';

import { AppText } from '@/core/ui';

import type { LiveState } from '../hooks/use-order-subscription';

/** Only visible while the real-time connection is down. */
export function LiveIndicator({ state }: { state: LiveState }) {
  if (state !== 'paused') return null;
  return (
    <View
      testID="live-paused-indicator"
      accessible
      accessibilityRole="alert"
      className="flex-row items-center gap-2 self-start py-1"
    >
      <View className="size-2 rounded-full bg-warning" />
      <AppText variant="caption" tone="warning">
        Live updates paused
      </AppText>
    </View>
  );
}
