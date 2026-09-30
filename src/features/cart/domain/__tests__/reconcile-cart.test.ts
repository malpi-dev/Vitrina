import type { Product } from '@/features/catalog/domain/product';

import type { CartItem } from '../cart-item';
import { reconcileCart } from '../reconcile-cart';

const fresh = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'mug',
  name: 'Mug',
  description: '',
  priceCents: 1000,
  currency: 'USD',
  categoryId: 'c1',
  imageUrls: ['img'],
  stock: 20,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

const line = (
  over: Partial<CartItem> = {},
  snap: Partial<CartItem['snapshot']> = {},
): CartItem => ({
  productId: 'p1',
  quantity: 2,
  snapshot: { name: 'Mug', priceCents: 1000, imageUrl: 'img', ...snap },
  addedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('reconcileCart', () => {
  it('returns the same reference and no notices when nothing changed', () => {
    const items = [line()];
    const r = reconcileCart(items, [fresh()]);
    expect(r.items).toBe(items);
    expect(r.notices).toEqual([]);
  });

  it('returns the same reference for an empty cart', () => {
    const items: CartItem[] = [];
    expect(reconcileCart(items, []).items).toBe(items);
  });

  it('removes missing products as unavailable using the snapshot name', () => {
    const r = reconcileCart([line({}, { name: 'Old name' })], []);
    expect(r.items).toEqual([]);
    expect(r.notices).toEqual([
      { type: 'removed', productId: 'p1', name: 'Old name', reason: 'unavailable' },
    ]);
  });

  it('removes inactive products as unavailable', () => {
    const r = reconcileCart([line()], [fresh({ isActive: false })]);
    expect(r.items).toEqual([]);
    expect(r.notices[0]).toMatchObject({ type: 'removed', reason: 'unavailable' });
  });

  it('removes products with no stock as outOfStock', () => {
    const r = reconcileCart([line()], [fresh({ stock: 0 })]);
    expect(r.items).toEqual([]);
    expect(r.notices[0]).toMatchObject({ type: 'removed', reason: 'outOfStock' });
  });

  it('adjusts the quantity to the stock', () => {
    const r = reconcileCart([line({ quantity: 5 })], [fresh({ stock: 3 })]);
    expect(r.items[0]?.quantity).toBe(3);
    expect(r.notices).toEqual([
      { type: 'quantityAdjusted', productId: 'p1', name: 'Mug', from: 5, to: 3 },
    ]);
  });

  it('adjusts the quantity to the per-line maximum', () => {
    const r = reconcileCart([line({ quantity: 12 })], [fresh({ stock: 100 })]);
    expect(r.items[0]?.quantity).toBe(10);
    expect(r.notices[0]).toMatchObject({ type: 'quantityAdjusted', from: 12, to: 10 });
  });

  it('updates the price and notifies', () => {
    const r = reconcileCart([line()], [fresh({ priceCents: 1200 })]);
    expect(r.items[0]?.snapshot.priceCents).toBe(1200);
    expect(r.notices).toEqual([
      { type: 'priceChanged', productId: 'p1', name: 'Mug', fromCents: 1000, toCents: 1200 },
    ]);
  });

  it('updates name and image silently', () => {
    const items = [line()];
    const r = reconcileCart(items, [fresh({ name: 'Mug v2', imageUrls: [] })]);
    expect(r.items).not.toBe(items);
    expect(r.items[0]?.snapshot).toEqual({ name: 'Mug v2', priceCents: 1000, imageUrl: null });
    expect(r.notices).toEqual([]);
  });

  it('emits both priceChanged and quantityAdjusted for one line', () => {
    const r = reconcileCart([line({ quantity: 6 })], [fresh({ priceCents: 900, stock: 4 })]);
    expect(r.items[0]).toMatchObject({ quantity: 4, snapshot: { priceCents: 900 } });
    expect(r.notices.map((n) => n.type)).toEqual(['priceChanged', 'quantityAdjusted']);
  });

  it('keeps notices in line order and untouched lines by reference', () => {
    const a = line({ productId: 'a' });
    const b = line({ productId: 'b' });
    const c = line({ productId: 'c' });
    const r = reconcileCart(
      [a, b, c],
      [fresh({ id: 'a' }), fresh({ id: 'b', priceCents: 1 }), fresh({ id: 'c', stock: 0 })],
    );
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toBe(a);
    expect(r.notices.map((n) => `${n.type}:${n.productId}`)).toEqual([
      'priceChanged:b',
      'removed:c',
    ]);
  });

  it('does not mutate its input', () => {
    const items = [line({ quantity: 9 })];
    const copy = JSON.parse(JSON.stringify(items)) as CartItem[];
    reconcileCart(items, [fresh({ stock: 1 })]);
    expect(items).toEqual(copy);
  });
});
