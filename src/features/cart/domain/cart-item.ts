export interface CartItem {
  productId: string;
  /** 1..MAX_QTY_PER_LINE */
  quantity: number;
  /** Display only, never used to charge. */
  snapshot: { name: string; priceCents: number; imageUrl: string | null };
  /** ISO string (persisted as JSON). */
  addedAt: string;
}

export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 20;

export const cartUnitCount = (items: CartItem[]): number =>
  items.reduce((n, i) => n + i.quantity, 0);
