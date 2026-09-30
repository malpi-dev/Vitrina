import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { toDomainError } from '@/core/errors';
import { useThemeColors } from '@/core/theme';
import { AppText, Badge, Card, EmptyState, ErrorState, Skeleton } from '@/core/ui';
import { formatMoney } from '@/core/utils/money';

import type { Order } from '../../domain/order';
import { LiveIndicator } from '../components/live-indicator';
import { ORDER_STATUS_PRESENTATION } from '../components/order-status-badge';
import { OrderTimeline } from '../components/order-timeline';
import { useOrder } from '../hooks/use-order';
import { useOrderLive } from '../hooks/use-order-live';

const SLOW_PAYMENT_MS = 30_000;

function DetailSkeleton() {
  return (
    <View testID="order-skeleton" className="gap-4 p-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </View>
  );
}

function StatusBlock({ order, slow }: { order: Order; slow: boolean }) {
  const colors = useThemeColors();
  if (order.status === 'pending_payment') {
    return (
      <View className="gap-1">
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={colors.primary} />
          <AppText variant="subtitle" testID="confirming-payment">
            Confirming payment…
          </AppText>
        </View>
        {slow ? (
          <AppText tone="muted" testID="payment-slow-hint">
            Taking longer than usual, pull to refresh
          </AppText>
        ) : null}
        {order.lastPaymentError ? (
          <AppText tone="muted" variant="caption" testID="payment-error">
            {order.lastPaymentError}
          </AppText>
        ) : null}
      </View>
    );
  }
  if (order.status === 'canceled') {
    return (
      <AppText tone="danger" variant="subtitle" testID="order-canceled-note">
        Expired — no charge was made
      </AppText>
    );
  }
  const { label, tone } = ORDER_STATUS_PRESENTATION[order.status];
  return <Badge label={label} tone={tone} testID={`order-status-${order.id}`} />;
}

function TotalRow({
  label,
  value,
  testID,
  strong = false,
}: {
  label: string;
  value: string;
  testID: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText variant={strong ? 'subtitle' : 'body'} tone={strong ? 'default' : 'muted'}>
        {label}
      </AppText>
      <AppText
        testID={testID}
        variant={strong ? 'subtitle' : 'body'}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
    </View>
  );
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOrder(id);
  const liveState = useOrderLive(id);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_PAYMENT_MS);
    return () => clearTimeout(timer);
  }, []);

  const order = query.data;
  const title = order ? `Order ${order.shortCode}` : 'Order';

  let body;
  if (query.isPending) {
    body = <DetailSkeleton />;
  } else if (query.isError && !order) {
    body =
      toDomainError(query.error).code === 'notFound' ? (
        <EmptyState
          testID="order-not-found"
          icon="receipt-outline"
          title="Order not found"
          message="It may not exist or it belongs to another account."
          actionLabel="Back to orders"
          actionTestID="back-to-orders-button"
          onAction={() => router.replace('/orders')}
        />
      ) : (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} testID="order-error" />
      );
  } else if (order) {
    const { shippingAddress: a } = order;
    body = (
      <ScrollView
        testID="order-detail-screen"
        className="flex-1"
        contentContainerClassName="gap-5 p-4 pb-10"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
      >
        <LiveIndicator state={liveState} />
        <StatusBlock order={order} slow={slow} />
        <Card className="gap-1">
          <OrderTimeline order={order} />
        </Card>

        <View className="gap-2">
          <AppText variant="subtitle">Items</AppText>
          {order.items.map((item) => (
            <View
              key={item.productId}
              testID={`order-item-${item.productId}`}
              className="flex-row items-start justify-between gap-3"
            >
              <AppText className="flex-1">
                {item.productName} × {item.quantity}
              </AppText>
              <AppText style={{ fontVariant: ['tabular-nums'] }}>
                {formatMoney(item.lineTotalCents)}
              </AppText>
            </View>
          ))}
        </View>

        <View className="gap-1" testID="order-address">
          <AppText variant="subtitle">Shipping address</AppText>
          <AppText tone="muted">{a.fullName}</AppText>
          <AppText tone="muted">{a.line1}</AppText>
          {a.line2 ? <AppText tone="muted">{a.line2}</AppText> : null}
          <AppText tone="muted">
            {a.city}, {a.state} {a.postalCode}
          </AppText>
          <AppText tone="muted">{a.country}</AppText>
          {a.phone ? <AppText tone="muted">{a.phone}</AppText> : null}
        </View>

        <View className="gap-2 border-t border-border pt-4">
          <TotalRow
            label="Subtotal"
            value={formatMoney(order.subtotalCents)}
            testID="order-subtotal"
          />
          <TotalRow
            label="Shipping"
            value={order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)}
            testID="order-shipping"
          />
          <TotalRow
            label="Total"
            value={formatMoney(order.totalCents)}
            testID="order-total"
            strong
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title }} />
      {body}
    </View>
  );
}
