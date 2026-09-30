import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { isDemoForced } from '@/core/config/env';
import { AppText, Button } from '@/core/ui';

import { useDemoActions } from '../hooks/use-demo-actions';

export function DemoBanner() {
  const router = useRouter();
  const { exitDemo } = useDemoActions();

  return (
    <View
      testID="demo-banner"
      className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3"
    >
      <AppText variant="label" className="flex-1">
        Demo mode — no real charges
      </AppText>
      {isDemoForced ? null : (
        <Button
          title="Exit demo"
          variant="ghost"
          testID="exit-demo-button"
          onPress={() => {
            exitDemo();
            router.replace('/sign-in');
          }}
        />
      )}
    </View>
  );
}
