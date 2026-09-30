import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { calculateCartTotals } from '@/features/cart/domain/calculate-cart-totals';
import { shippingAddressSchema } from '@/features/checkout/domain/shipping-address';

import catalog from '../catalog.json';
import { DEMO_PROFILE, DEMO_USER, buildDemoProducts, buildSampleOrders, demoCategories } from '..';

const seed = readFileSync(join(__dirname, '../../../../../../supabase/seed.sql'), 'utf8');
const SQL_TEXT = "(?:[^']|'')*";

interface SeedProduct {
  id: string;
  slug: string;
  priceCents: number;
  categoryId: string;
  imagePaths: string[];
  stock: number;
  isActive: boolean;
}

const productRe = new RegExp(
  `^\\s*\\('([^']+)', '([^']+)', '${SQL_TEXT}', '${SQL_TEXT}', (\\d+), 'USD', '([^']+)', array\\[(.*?)\\]::text\\[\\], (\\d+), (true|false), '[^']+'\\)`,
);
const categoryRe = /^\s*\('([^']+)', '([^']+)', '((?:[^']|'')*)', (\d+)\)/;

const seedProducts: SeedProduct[] = seed
  .split('\n')
  .map((line) => productRe.exec(line))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({
    id: m[1]!,
    slug: m[2]!,
    priceCents: Number(m[3]),
    categoryId: m[4]!,
    imagePaths: [...m[5]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!),
    stock: Number(m[6]),
    isActive: m[7] === 'true',
  }));

const seedCategories = seed
  .split('\n')
  .map((line) => categoryRe.exec(line))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ id: m[1]!, slug: m[2]!, name: m[3]!, sortOrder: Number(m[4]) }));

describe('fixtures parity with supabase/seed.sql', () => {
  it('has the same 30 products (ids, slugs, prices, categories, images, stock, active)', () => {
    expect(seedProducts).toHaveLength(30);
    const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);
    const fromJson = catalog.products
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        priceCents: p.priceCents,
        categoryId: p.categoryId,
        imagePaths: p.imagePaths,
        stock: p.stock,
        isActive: p.isActive,
      }))
      .sort(byId);
    expect([...seedProducts].sort(byId)).toEqual(fromJson);
  });

  it('has the same 5 categories', () => {
    expect(seedCategories).toHaveLength(5);
    expect(seedCategories).toEqual(demoCategories);
  });

  it('builds domain products with resolved image urls', () => {
    const products = buildDemoProducts();
    expect(products).toHaveLength(30);
    for (const product of products) {
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.imageUrls.length).toBe(
        catalog.products.find((p) => p.id === product.id)!.imagePaths.length,
      );
      expect(product.imageUrls.every((u) => typeof u === 'string' && u.length > 0)).toBe(true);
    }
  });
});

describe('demo user and sample orders', () => {
  it('has a demo profile with a valid US default address', () => {
    expect(DEMO_PROFILE.id).toBe(DEMO_USER.id);
    expect(DEMO_PROFILE.fullName).toBe('Demo Shopper');
    expect(shippingAddressSchema.safeParse(DEMO_PROFILE.defaultAddress).success).toBe(true);
    expect(DEMO_PROFILE.defaultAddress?.country).toBe('US');
  });

  const now = new Date('2026-10-05T12:00:00.000Z');
  const orders = buildSampleOrders(now);
  const DAY = 24 * 60 * 60 * 1000;

  it('builds the 3 sample orders with the expected ids, codes and statuses', () => {
    expect(orders.map((o) => [o.id.slice(-3), o.shortCode, o.status])).toEqual([
      ['301', 'VT-DM24', 'delivered'],
      ['302', 'VT-DM37', 'shipped'],
      ['303', 'VT-DM59', 'canceled'],
    ]);
    expect(orders.every((o) => o.userId === DEMO_USER.id)).toBe(true);
  });

  it('dates the orders relative to now', () => {
    const [delivered, shipped, canceled] = orders;
    expect(delivered!.createdAt.getTime()).toBe(now.getTime() - 12 * DAY);
    expect(delivered!.paidAt).not.toBeNull();
    expect(delivered!.shippedAt!.getTime() - delivered!.createdAt.getTime()).toBe(DAY);
    expect(delivered!.deliveredAt!.getTime() - delivered!.createdAt.getTime()).toBe(3 * DAY);
    expect(shipped!.createdAt.getTime()).toBe(now.getTime() - 2 * DAY);
    expect(shipped!.paidAt).not.toBeNull();
    expect(shipped!.shippedAt).not.toBeNull();
    expect(shipped!.deliveredAt).toBeNull();
    expect(canceled!.createdAt.getTime()).toBe(now.getTime() - 5 * DAY);
    expect(canceled!.canceledAt!.getTime() - canceled!.createdAt.getTime()).toBe(30 * 60 * 1000);
    expect(canceled!.paidAt).toBeNull();
  });

  it('uses catalog prices and computed totals', () => {
    const prices = new Map(catalog.products.map((p) => [p.id, p.priceCents]));
    for (const order of orders) {
      for (const item of order.items) {
        expect(item.unitPriceCents).toBe(prices.get(item.productId));
        expect(item.lineTotalCents).toBe(item.unitPriceCents * item.quantity);
      }
      const totals = calculateCartTotals(
        order.items.map((i) => ({ priceCents: i.unitPriceCents, quantity: i.quantity })),
      );
      expect(order.subtotalCents).toBe(totals.subtotalCents);
      expect(order.shippingCents).toBe(totals.shippingCents);
      expect(order.totalCents).toBe(totals.totalCents);
    }
  });
});
