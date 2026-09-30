import type { Product } from '../product';
import { isInStock } from '../product';
import {
  compareProducts,
  hasActiveFilters,
  matchesFilters,
  parseProductFilters,
  toProductSearchParams,
  type ProductFilters,
} from '../product-query';

const CAT = '11111111-1111-4111-8111-111111111111';

const make = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'stoneware-mug',
  name: 'Stoneware Mug',
  description: '',
  priceCents: 2000,
  currency: 'USD',
  categoryId: CAT,
  imageUrls: [],
  stock: 5,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

describe('isInStock', () => {
  it('requires active and stock > 0', () => {
    expect(isInStock({ stock: 1, isActive: true })).toBe(true);
    expect(isInStock({ stock: 0, isActive: true })).toBe(false);
    expect(isInStock({ stock: 9, isActive: false })).toBe(false);
  });
});

describe('parseProductFilters', () => {
  it('defaults to newest with nothing else', () => {
    expect(parseProductFilters({})).toEqual({ sort: 'newest' });
  });

  it('parses every key, converting dollars to cents', () => {
    expect(
      parseProductFilters({
        q: '  mug ',
        category: CAT,
        min: '10',
        max: '50',
        inStock: '1',
        sort: 'price_desc',
      }),
    ).toEqual({
      q: 'mug',
      categoryId: CAT,
      minCents: 1000,
      maxCents: 5000,
      inStock: true,
      sort: 'price_desc',
    });
  });

  it('ignores invalid values', () => {
    expect(
      parseProductFilters({
        q: '   ',
        category: 'not-a-uuid',
        min: 'abc',
        max: '-5',
        inStock: '0',
        sort: 'foo',
      }),
    ).toEqual({ sort: 'newest' });
    expect(parseProductFilters({ min: '1.5', max: '' })).toEqual({ sort: 'newest' });
    expect(parseProductFilters({ min: '99999999999999999' })).toEqual({ sort: 'newest' });
  });

  it('swaps min and max when reversed', () => {
    expect(parseProductFilters({ min: '50', max: '10' })).toEqual({
      minCents: 1000,
      maxCents: 5000,
      sort: 'newest',
    });
  });

  it('keeps a lone min or max', () => {
    expect(parseProductFilters({ min: '5' })).toEqual({ minCents: 500, sort: 'newest' });
    expect(parseProductFilters({ max: '0' })).toEqual({ maxCents: 0, sort: 'newest' });
  });

  it('uses the first value of arrays', () => {
    expect(parseProductFilters({ q: ['mug', 'cup'], sort: ['price_asc', 'newest'] })).toEqual({
      q: 'mug',
      sort: 'price_asc',
    });
    expect(parseProductFilters({ q: [] })).toEqual({ sort: 'newest' });
  });
});

describe('toProductSearchParams', () => {
  it('omits empty keys and the default sort', () => {
    expect(toProductSearchParams({ sort: 'newest' })).toEqual({});
    expect(toProductSearchParams({ q: '', sort: 'newest', inStock: false })).toEqual({});
  });

  it('round-trips through parseProductFilters', () => {
    const cases: ProductFilters[] = [
      { sort: 'newest' },
      { sort: 'price_asc', q: 'mug' },
      { sort: 'price_desc', categoryId: CAT, minCents: 1000, maxCents: 5000, inStock: true },
      { sort: 'newest', minCents: 0 },
    ];
    for (const filters of cases) {
      expect(parseProductFilters(toProductSearchParams(filters))).toEqual(filters);
    }
  });
});

describe('hasActiveFilters', () => {
  it('ignores the sort order', () => {
    expect(hasActiveFilters({ sort: 'newest' })).toBe(false);
    expect(hasActiveFilters({ sort: 'price_asc' })).toBe(false);
    expect(hasActiveFilters({ sort: 'newest', inStock: false })).toBe(false);
  });

  it.each<[string, ProductFilters]>([
    ['q', { sort: 'newest', q: 'a' }],
    ['category', { sort: 'newest', categoryId: CAT }],
    ['min', { sort: 'newest', minCents: 0 }],
    ['max', { sort: 'newest', maxCents: 100 }],
    ['inStock', { sort: 'newest', inStock: true }],
  ])('is true with %s', (_name, filters) => {
    expect(hasActiveFilters(filters)).toBe(true);
  });
});

describe('matchesFilters', () => {
  const none: ProductFilters = { sort: 'newest' };

  it('matches everything active with no filters', () => {
    expect(matchesFilters(make(), none)).toBe(true);
  });

  it('excludes inactive products', () => {
    expect(matchesFilters(make({ isActive: false }), none)).toBe(false);
  });

  it('searches the name case-insensitively', () => {
    expect(matchesFilters(make(), { ...none, q: 'MUG' })).toBe(true);
    expect(matchesFilters(make(), { ...none, q: 'ware m' })).toBe(true);
    expect(matchesFilters(make(), { ...none, q: 'plate' })).toBe(false);
  });

  it('filters by category', () => {
    expect(matchesFilters(make(), { ...none, categoryId: CAT })).toBe(true);
    expect(matchesFilters(make(), { ...none, categoryId: 'other' })).toBe(false);
  });

  it('uses an inclusive price range', () => {
    const p = make({ priceCents: 2000 });
    expect(matchesFilters(p, { ...none, minCents: 2000, maxCents: 2000 })).toBe(true);
    expect(matchesFilters(p, { ...none, minCents: 2001 })).toBe(false);
    expect(matchesFilters(p, { ...none, maxCents: 1999 })).toBe(false);
  });

  it('inStock means stock > 0', () => {
    expect(matchesFilters(make({ stock: 0 }), { ...none, inStock: true })).toBe(false);
    expect(matchesFilters(make({ stock: 1 }), { ...none, inStock: true })).toBe(true);
    expect(matchesFilters(make({ stock: 0 }), { ...none, inStock: false })).toBe(true);
  });
});

describe('compareProducts', () => {
  const t1 = new Date('2026-01-01T00:00:00Z');
  const t2 = new Date('2026-02-01T00:00:00Z');
  const a = make({ id: 'a', priceCents: 100, createdAt: t1 });
  const b = make({ id: 'b', priceCents: 300, createdAt: t2 });
  const c = make({ id: 'c', priceCents: 300, createdAt: t2 });
  const d = make({ id: 'd', priceCents: 300, createdAt: t1 });
  const ids = (list: Product[], sort: Parameters<typeof compareProducts>[0]) =>
    [...list].sort(compareProducts(sort)).map((p) => p.id);

  it('newest: createdAt desc, ties by id', () => {
    expect(ids([a, c, b, d], 'newest')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('price_asc: cheapest first, ties newest then id', () => {
    expect(ids([c, d, b, a], 'price_asc')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('price_desc: priciest first, ties newest then id', () => {
    expect(ids([a, d, c, b], 'price_desc')).toEqual(['b', 'c', 'd', 'a']);
  });

  it('treats identical products as equal', () => {
    expect(compareProducts('newest')(a, a)).toBe(0);
  });
});
