import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { AppText, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';
import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';

import type { Order } from '../../domain/order';
import { LiveIndicator } from '../components/live-indicator';
import { OrderRow } from '../components/order-row';
import { useOrders } from '../hooks/use-orders';
import { useOrdersLive } from '../hooks/use-orders-live';

function OrdersSkeleton() {
  return (
    <View testID="orders-skeleton" className="gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const mode = useSessionMode();
  const query = useOrders();
  const liveState = useOrdersLive();

  const openOrder = useCallback(
    (order: Order) => router.push({ pathname: '/orders/[id]', params: { id: order.id } }),
    [router],
  );

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

  const body =
    mode === 'unknown' || query.isPending ? (
      <OrdersSkeleton />
    ) : query.isError && !query.data ? (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} testID="orders-error" />
    ) : (
      <FlashList
        testID="orders-list"
        data={query.data}
        keyExtractor={(order) => order.id}
        renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        ListEmptyComponent={
          <EmptyState
            testID="orders-empty"
            icon="receipt-outline"
            title="No orders yet"
            message="Your orders and their status will appear here."
            actionLabel="Start shopping"
            actionTestID="start-shopping-button"
            onAction={() => router.navigate('/')}
          />
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    );

  return (
    <Screen testID="orders-screen">
      <View className="flex-row items-center justify-between py-3">
        <AppText variant="title">Orders</AppText>
        <LiveIndicator state={liveState} />
      </View>
      {body}
    </Screen>
  );
}
