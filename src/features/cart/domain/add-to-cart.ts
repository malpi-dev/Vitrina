import type { Product } from '@/features/catalog/domain/product';

import { MAX_LINES, MAX_QTY_PER_LINE, type CartItem } from './cart-item';

export type AddToCartResult =
  | { outcome: 'added' | 'merged'; items: CartItem[] }
  /** `quantity` is the final quantity of the line. */
  | { outcome: 'clamped'; items: CartItem[]; quantity: number }
  | {
      outcome: 'rejected';
      items: CartItem[];
      reason: 'outOfStock' | 'tooManyLines' | 'invalidQuantity' | 'lineFull';
    };

type AddableProduct = Pick<
  Product,
  'id' | 'name' | 'priceCents' | 'stock' | 'isActive' | 'imageUrls'
>;

const clampQuantity = (quantity: number): number =>
  Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.floor(quantity)));

/** Merges lines and applies the stock, per-line and line-count limits. Never mutates `items`. */
export function addToCart(
  items: CartItem[],
  product: AddableProduct,
  quantity: number,
  now: Date,
): AddToCartResult {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { outcome: 'rejected', items, reason: 'invalidQuantity' };
  }
  if (!product.isActive || product.stock <= 0) {
    return { outcome: 'rejected', items, reason: 'outOfStock' };
  }

  const limit = Math.min(product.stock, MAX_QTY_PER_LINE);
  const snapshot = {
    name: product.name,
    priceCents: product.priceCents,
    imageUrl: product.imageUrls[0] ?? null,
  };
  const index = items.findIndex((i) => i.productId === product.id);

  if (index >= 0) {
    const existing = items[index]!;
    if (existing.quantity >= limit) return { outcome: 'rejected', items, reason: 'lineFull' };
    const wanted = existing.quantity + quantity;
    const final = Math.min(wanted, limit);
    const next = items.map((i, n) => (n === index ? { ...i, quantity: final, snapshot } : i));
    return wanted > limit
      ? { outcome: 'clamped', items: next, quantity: final }
      : { outcome: 'merged', items: next };
  }

  if (items.length >= MAX_LINES) return { outcome: 'rejected', items, reason: 'tooManyLines' };
  const final = Math.min(quantity, limit);
  const line: CartItem = {
    productId: product.id,
    quantity: final,
    snapshot,
    addedAt: now.toISOString(),
  };
  const next = [...items, line];
  return quantity > limit
    ? { outcome: 'clamped', items: next, quantity: final }
    : { outcome: 'added', items: next };
}

/** Sets a line's quantity, clamped to 1..MAX_QTY_PER_LINE. Unknown ids leave the cart as is. */
export function updateQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  if (!Number.isFinite(quantity) || !items.some((i) => i.productId === productId)) return items;
  const next = clampQuantity(quantity);
  return items.map((i) => (i.productId === productId ? { ...i, quantity: next } : i));
}

export const removeItem = (items: CartItem[], productId: string): CartItem[] =>
  items.filter((i) => i.productId !== productId);
