import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/core/ui';

/** Provisional (phase 05); the real order history arrives in phase 09. */
export default function OrdersScreen() {
  const router = useRouter();
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
