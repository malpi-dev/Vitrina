import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import catalog from '../fixtures/catalog.json';

describe('shared demo catalog (source of supabase/seed.sql)', () => {
  it('has 5 categories and 30 products with unique ids and slugs', () => {
    expect(catalog.categories).toHaveLength(5);
    expect(catalog.products).toHaveLength(30);
    expect(new Set(catalog.products.map((p) => p.id)).size).toBe(30);
    expect(new Set(catalog.products.map((p) => p.slug)).size).toBe(30);
  });

  it('references existing categories and valid image paths', () => {
    const categoryIds = new Set(catalog.categories.map((c) => c.id));
    for (const product of catalog.products) {
      expect(categoryIds.has(product.categoryId)).toBe(true);
      expect(product.imagePaths.length).toBeGreaterThanOrEqual(1);
      expect(product.imagePaths.length).toBeLessThanOrEqual(3);
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });

  it('has the documented stock edge cases', () => {
    const byStock = (predicate: (stock: number) => boolean) =>
      catalog.products.filter((p) => predicate(p.stock)).map((p) => p.id.slice(-2));
    expect(byStock((s) => s === 0)).toEqual(['06', '17']);
    expect(byStock((s) => s >= 1 && s <= 3)).toEqual(['04', '08', '12', '22', '30']);
  });

  it('matches the generated supabase/seed.sql', () => {
    const seed = readFileSync(join(__dirname, '../../../../../supabase/seed.sql'), 'utf8');
    for (const product of catalog.products) {
      expect(seed).toContain(`'${product.id}'`);
      expect(seed).toContain(`${product.priceCents}, 'USD', '${product.categoryId}'`);
    }
  });
});
