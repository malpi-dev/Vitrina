import { DomainError } from '@/core/errors';
import { MAX_LINES, MAX_QTY_PER_LINE, type CartItem } from '@/features/cart/domain/cart-item';

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export const toCheckoutItems = (items: CartItem[]): CheckoutItemInput[] =>
  items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

/** Throws a `validation` DomainError: 1-20 lines, integer quantities 1-10, no repeated products. */
export function validateCheckoutItems(items: CheckoutItemInput[]): void {
  const fail = (message: string): never => {
    throw new DomainError({ code: 'validation', fields: { items: message } }, message);
  };

  if (items.length < 1) fail('The cart is empty');
  if (items.length > MAX_LINES) fail(`At most ${MAX_LINES} different products per order`);

  const seen = new Set<string>();
  for (const { productId, quantity } of items) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      fail(`Quantity must be a whole number from 1 to ${MAX_QTY_PER_LINE}`);
    }
    if (seen.has(productId)) fail('Duplicate products are not allowed');
    seen.add(productId);
  }
}
