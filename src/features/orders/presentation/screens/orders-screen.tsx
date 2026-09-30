import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/core/ui';
import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';

/** Provisional (phase 05); the real order history arrives in phase 09. */
export default function OrdersScreen() {
  const router = useRouter();
  const mode = useSessionMode();

  if (mode === 'guest') {
    return (
      <Screen testID="orders-screen">
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in to see your orders"
          message="Your orders and their status will appear here once you sign in."
          actionLabel="Sign in"
          actionTestID="orders-sign-in-button"
          onAction={() => router.push({ pathname: '/sign-in', params: { redirect: '/orders' } })}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="orders-screen">
      <EmptyState
        icon="receipt-outline"
        title="No orders yet"
        message="Your orders and their status will appear here."
        actionLabel="Start shopping"
        actionTestID="start-shopping-button"
        onAction={() => router.navigate('/')}
      />
    </Screen>
  );
}
