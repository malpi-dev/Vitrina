import { Badge, type BadgeTone } from '@/core/ui';

import type { OrderStatus } from '../../domain/order-status';

export const ORDER_STATUS_PRESENTATION: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  shipped: { label: 'Shipped', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  canceled: { label: 'Canceled', tone: 'danger' },
};

interface OrderStatusBadgeProps {
  orderId: string;
  status: OrderStatus;
}

export function OrderStatusBadge({ orderId, status }: OrderStatusBadgeProps) {
  const { label, tone } = ORDER_STATUS_PRESENTATION[status];
  return <Badge label={label} tone={tone} testID={`order-status-${orderId}`} />;
}
