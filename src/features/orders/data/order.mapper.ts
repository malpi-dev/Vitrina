import { DomainError } from '@/core/errors';
import type { Database } from '@/core/supabase/database.generated';
import { shippingAddressSchema } from '@/features/checkout/domain/shipping-address';

import type { Order, OrderItem } from '../domain/order';

type Tables = Database['vitrina']['Tables'];
export type OrderItemRow = Tables['order_items']['Row'];
/** An `orders` row with its embedded `order_items` (`select('*, order_items(*)')`). */
export type OrderRow = Tables['orders']['Row'] & { order_items: OrderItemRow[] };

const toDate = (value: string | null): Date | null => (value === null ? null : new Date(value));

function toItem(row: OrderItemRow): OrderItem {
  return {
    productId: row.product_id,
    productName: row.product_name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    // Generated column: the database always fills it, but the type is nullable.
    lineTotalCents: row.line_total_cents ?? row.unit_price_cents * row.quantity,
  };
}

/** snake_case rows -> domain `Order`. Items are sorted by product name. */
export function toOrder(row: OrderRow): Order {
  // `create_order` always validates the address, so a bad one means corrupted data.
  const address = shippingAddressSchema.safeParse(row.shipping_address);
  if (!address.success) {
    throw new DomainError({ code: 'unknown' }, 'Order has an invalid shipping address');
  }
  return {
    id: row.id,
    shortCode: row.short_code,
    userId: row.user_id,
    status: row.status,
    items: row.order_items
      .map(toItem)
      .sort((a, b) => a.productName.localeCompare(b.productName, 'en')),
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    currency: 'USD',
    shippingAddress: address.data,
    lastPaymentError: row.last_payment_error,
    createdAt: new Date(row.created_at),
    paidAt: toDate(row.paid_at),
    shippedAt: toDate(row.shipped_at),
    deliveredAt: toDate(row.delivered_at),
    canceledAt: toDate(row.canceled_at),
  };
}
