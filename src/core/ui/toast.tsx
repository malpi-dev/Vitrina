import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { useToastStore, type ToastTone } from './toast.store';

const CONTAINER: Record<ToastTone, string> = {
  info: 'bg-text',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

/** Mount once in the root layout. */
export function ToastHost() {
  const { message, tone, id } = useToastStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center px-4"
      style={{ bottom: insets.bottom + 16 }}
    >
      {message ? (
        <Animated.View
          key={id}
          entering={FadeInDown}
          exiting={FadeOutDown}
          testID="toast"
          accessibilityLiveRegion="polite"
          className={`rounded-xl px-4 py-3 ${CONTAINER[tone]}`}
        >
          <AppText variant="label" className="text-background">
            {message}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}
