import { View } from 'react-native';

import { AppText, Card, Price } from '@/core/ui';

import type { Order } from '../../domain/order';
import { formatOrderDay } from '../format-order-date';

import { OrderStatusBadge } from './order-status-badge';

interface OrderRowProps {
  order: Order;
  onPress: (order: Order) => void;
}

export function OrderRow({ order, onPress }: OrderRowProps) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Card testID={`order-row-${order.id}`} onPress={() => onPress(order)} className="mb-3 gap-2">
      <View className="flex-row items-center justify-between">
        <AppText variant="subtitle">{order.shortCode}</AppText>
        <OrderStatusBadge orderId={order.id} status={order.status} />
      </View>
      <View className="flex-row items-center justify-between">
        <AppText tone="muted" variant="caption">
          {formatOrderDay(order.createdAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </AppText>
        <Price cents={order.totalCents} />
      </View>
    </Card>
  );
}
