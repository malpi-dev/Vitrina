import { isInStock, type Product } from '@/features/catalog/domain/product';

import { MAX_QTY_PER_LINE, type CartItem } from './cart-item';

export type CartNotice =
  | { type: 'priceChanged'; productId: string; name: string; fromCents: number; toCents: number }
  | { type: 'quantityAdjusted'; productId: string; name: string; from: number; to: number }
  | { type: 'removed'; productId: string; name: string; reason: 'unavailable' | 'outOfStock' };

/**
 * Brings the local cart in line with fresh server data. Returns the same `items` reference
 * (and no notices) when nothing changed, to avoid useless renders and storage writes.
 */
export function reconcileCart(
  items: CartItem[],
  fresh: Product[],
): { items: CartItem[]; notices: CartNotice[] } {
  const byId = new Map(fresh.map((p) => [p.id, p]));
  const notices: CartNotice[] = [];
  const next: CartItem[] = [];
  let changed = false;

  for (const item of items) {
    const product = byId.get(item.productId);
    const name = item.snapshot.name;

    if (!product || !product.isActive) {
      notices.push({ type: 'removed', productId: item.productId, name, reason: 'unavailable' });
      changed = true;
      continue;
    }
    if (!isInStock(product)) {
      notices.push({ type: 'removed', productId: item.productId, name, reason: 'outOfStock' });
      changed = true;
      continue;
    }

    let quantity = item.quantity;
    if (product.priceCents !== item.snapshot.priceCents) {
      notices.push({
        type: 'priceChanged',
        productId: item.productId,
        name,
        fromCents: item.snapshot.priceCents,
        toCents: product.priceCents,
      });
    }

    const limit = Math.min(product.stock, MAX_QTY_PER_LINE);
    if (quantity > limit) {
      notices.push({
        type: 'quantityAdjusted',
        productId: item.productId,
        name,
        from: quantity,
        to: limit,
      });
      quantity = limit;
    }

    const snapshot = {
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: product.imageUrls[0] ?? null,
    };
    const same =
      quantity === item.quantity &&
      snapshot.name === item.snapshot.name &&
      snapshot.priceCents === item.snapshot.priceCents &&
      snapshot.imageUrl === item.snapshot.imageUrl;
    if (same) {
      next.push(item);
    } else {
      next.push({ ...item, quantity, snapshot });
      changed = true;
    }
  }

  return changed ? { items: next, notices } : { items, notices: [] };
}
