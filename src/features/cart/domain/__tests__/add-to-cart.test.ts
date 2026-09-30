import type { Product } from '@/features/catalog/domain/product';

import { addToCart, removeItem, updateQuantity } from '../add-to-cart';
import { MAX_LINES, type CartItem } from '../cart-item';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const OLD = '2026-01-01T00:00:00.000Z';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'mug',
  name: 'Mug',
  description: '',
  priceCents: 1500,
  currency: 'USD',
  categoryId: 'c1',
  imageUrls: ['img-1', 'img-2'],
  stock: 50,
  isActive: true,
  createdAt: NOW,
  ...over,
});

const line = (productId: string, quantity: number, priceCents = 1000): CartItem => ({
  productId,
  quantity,
  snapshot: { name: `name-${productId}`, priceCents, imageUrl: null },
  addedAt: OLD,
});

describe('addToCart', () => {
  it('adds a new line at the end with a fresh snapshot', () => {
    const items = [line('a', 1)];
    const r = addToCart(items, product(), 2, NOW);
    expect(r.outcome).toBe('added');
    expect(r.items.map((i) => i.productId)).toEqual(['a', 'p1']);
    expect(r.items[1]).toEqual({
      productId: 'p1',
      quantity: 2,
      snapshot: { name: 'Mug', priceCents: 1500, imageUrl: 'img-1' },
      addedAt: NOW.toISOString(),
    });
  });

  it('uses a null image when the product has none', () => {
    const r = addToCart([], product({ imageUrls: [] }), 1, NOW);
    expect(r.items[0]?.snapshot.imageUrl).toBeNull();
  });

  it('merges into an existing line and refreshes its snapshot, keeping order and addedAt', () => {
    const items = [line('p1', 2, 999), line('z', 1)];
    const r = addToCart(items, product({ priceCents: 1500 }), 3, NOW);
    expect(r.outcome).toBe('merged');
    expect(r.items[0]).toEqual({
      productId: 'p1',
      quantity: 5,
      snapshot: { name: 'Mug', priceCents: 1500, imageUrl: 'img-1' },
      addedAt: OLD,
    });
    expect(r.items[1]).toBe(items[1]);
  });

  it('merges exactly up to the limit without clamping', () => {
    const r = addToCart([line('p1', 7)], product(), 3, NOW);
    expect(r.outcome).toBe('merged');
    expect(r.items[0]?.quantity).toBe(10);
  });

  it('clamps an existing line to 10', () => {
    const r = addToCart([line('p1', 8)], product(), 5, NOW);
    expect(r).toMatchObject({ outcome: 'clamped', quantity: 10 });
    expect(r.items[0]?.quantity).toBe(10);
  });

  it('clamps an existing line to the stock', () => {
    const r = addToCart([line('p1', 2)], product({ stock: 4 }), 5, NOW);
    expect(r).toMatchObject({ outcome: 'clamped', quantity: 4 });
  });

  it('clamps a new line to 10', () => {
    const r = addToCart([], product(), 11, NOW);
    expect(r).toMatchObject({ outcome: 'clamped', quantity: 10 });
    expect(r.items[0]?.quantity).toBe(10);
  });

  it('clamps a new line to the stock', () => {
    const r = addToCart([], product({ stock: 3 }), 5, NOW);
    expect(r).toMatchObject({ outcome: 'clamped', quantity: 3 });
  });

  it('adds a new line of exactly the limit without clamping', () => {
    expect(addToCart([], product({ stock: 3 }), 3, NOW).outcome).toBe('added');
    expect(addToCart([], product(), 10, NOW).outcome).toBe('added');
  });

  it('rejects invalid quantities', () => {
    for (const q of [0, -1, 1.5, NaN, Infinity]) {
      const items = [line('a', 1)];
      const r = addToCart(items, product(), q, NOW);
      expect(r).toEqual({ outcome: 'rejected', items, reason: 'invalidQuantity' });
    }
  });

  it('rejects inactive or out-of-stock products', () => {
    expect(addToCart([], product({ isActive: false }), 1, NOW)).toMatchObject({
      outcome: 'rejected',
      reason: 'outOfStock',
    });
    expect(addToCart([], product({ stock: 0 }), 1, NOW)).toMatchObject({
      outcome: 'rejected',
      reason: 'outOfStock',
    });
  });

  it('rejects when the existing line is already at the limit', () => {
    const items = [line('p1', 10)];
    expect(addToCart(items, product(), 1, NOW)).toEqual({
      outcome: 'rejected',
      items,
      reason: 'lineFull',
    });
    const low = [line('p1', 3)];
    expect(addToCart(low, product({ stock: 3 }), 1, NOW)).toMatchObject({ reason: 'lineFull' });
  });

  it('rejects a 21st line but still merges into existing ones', () => {
    const items = Array.from({ length: MAX_LINES }, (_, n) => line(`x${n}`, 1));
    expect(addToCart(items, product(), 1, NOW)).toEqual({
      outcome: 'rejected',
      items,
      reason: 'tooManyLines',
    });
    expect(addToCart(items, product({ id: 'x3' }), 1, NOW).outcome).toBe('merged');
  });

  it('allows the 20th line', () => {
    const items = Array.from({ length: MAX_LINES - 1 }, (_, n) => line(`x${n}`, 1));
    expect(addToCart(items, product(), 1, NOW).items).toHaveLength(MAX_LINES);
  });

  it('never mutates its input', () => {
    const items = [line('p1', 2)];
    const frozen = Object.freeze(items.map((i) => Object.freeze({ ...i })));
    const copy = JSON.parse(JSON.stringify(frozen)) as CartItem[];
    const r = addToCart(frozen as CartItem[], product(), 1, NOW);
    expect(frozen).toEqual(copy);
    expect(r.items).not.toBe(frozen);
  });
});

describe('updateQuantity', () => {
  const items = [line('a', 2), line('b', 3)];

  it('sets the quantity without touching other lines', () => {
    const r = updateQuantity(items, 'a', 5);
    expect(r[0]?.quantity).toBe(5);
    expect(r[1]).toBe(items[1]);
    expect(items[0]?.quantity).toBe(2);
  });

  it('clamps to 1..10 and floors decimals', () => {
    expect(updateQuantity(items, 'a', 0)[0]?.quantity).toBe(1);
    expect(updateQuantity(items, 'a', -4)[0]?.quantity).toBe(1);
    expect(updateQuantity(items, 'a', 99)[0]?.quantity).toBe(10);
    expect(updateQuantity(items, 'a', 3.9)[0]?.quantity).toBe(3);
  });

  it('returns the same array for unknown ids or non-finite quantities', () => {
    expect(updateQuantity(items, 'zzz', 3)).toBe(items);
    expect(updateQuantity(items, 'a', NaN)).toBe(items);
  });
});

describe('removeItem', () => {
  it('removes the line and keeps the order', () => {
    const items = [line('a', 1), line('b', 1), line('c', 1)];
    expect(removeItem(items, 'b').map((i) => i.productId)).toEqual(['a', 'c']);
    expect(items).toHaveLength(3);
  });

  it('ignores unknown ids', () => {
    expect(removeItem([line('a', 1)], 'x')).toHaveLength(1);
  });
});
