import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/core/ui';

/** Provisional (phase 05); the real cart arrives in phase 07. */
export default function CartScreen() {
  const router = useRouter();
  return (
    <Screen testID="cart-screen">
      <EmptyState
        icon="bag-outline"
        title="Your cart is empty"
        message="Add something you like and it will show up here."
        actionLabel="Browse products"
        actionTestID="browse-products-button"
        onAction={() => router.navigate('/')}
      />
    </Screen>
  );
}
