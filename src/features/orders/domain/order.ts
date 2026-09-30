import type { ShippingAddress } from '@/features/checkout/domain/shipping-address';

import type { OrderStatus } from './order-status';

export interface OrderItem {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  /** e.g. VT-7K3Q */
  shortCode: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: 'USD';
  shippingAddress: ShippingAddress;
  lastPaymentError: string | null;
  createdAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  canceledAt: Date | null;
}
