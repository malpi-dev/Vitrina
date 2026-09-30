import { DEFAULT_SHIPPING_POLICY, type ShippingPolicy } from './shipping-policy';

export interface CartTotals {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  itemCount: number;
}

/** Same rule as the `create_order` RPC: keep the test cases in sync with pgTAP. */
export function calculateCartTotals(
  lines: { priceCents: number; quantity: number }[],
  policy: ShippingPolicy = DEFAULT_SHIPPING_POLICY,
): CartTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const shippingCents =
    lines.length === 0 || subtotalCents >= policy.freeFromCents ? 0 : policy.flatCents;
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents, itemCount };
}
