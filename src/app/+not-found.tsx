import { Stack, useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/core/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen testID="not-found-screen">
        <EmptyState
          icon="alert-circle-outline"
          title="This screen doesn't exist"
          actionLabel="Go home"
          onAction={() => router.replace('/')}
        />
      </Screen>
    </>
  );
}
