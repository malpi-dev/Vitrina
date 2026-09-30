export interface ShippingPolicy {
  flatCents: number;
  freeFromCents: number;
}

/** $4.99 flat, free from $50.00. The `create_order` RPC applies the same rule. */
export const DEFAULT_SHIPPING_POLICY: ShippingPolicy = { flatCents: 499, freeFromCents: 5000 };
