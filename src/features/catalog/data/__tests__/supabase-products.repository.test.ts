import { DomainError } from '@/core/errors';
import { createFakeSupabase } from '@/test/fake-supabase';

import type { ProductRow } from '../product.mapper';
import { escapeLike, SupabaseProductsRepository } from '../supabase-products.repository';

const row = (n: number, overrides: Partial<ProductRow> = {}): ProductRow => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  slug: `product-${n}`,
  name: `Product ${n}`,
  description: 'A product',
  price_cents: 1999,
  currency: 'USD',
  category_id: '11111111-1111-4111-8111-111111111111',
  image_paths: [`product-${n}-1.webp`, `product-${n}-2.webp`],
  stock: 5,
  is_active: true,
  created_at: '2026-09-01T10:00:00+00:00',
  updated_at: '2026-09-01T10:00:00+00:00',
  ...overrides,
});

const rows = (count: number) => Array.from({ length: count }, (_, i) => row(i + 1));

function setup() {
  const fake = createFakeSupabase();
  return { fake, repo: new SupabaseProductsRepository(fake.client) };
}

describe('escapeLike', () => {
  it('escapes backslash, percent and underscore', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(escapeLike('mug')).toBe('mug');
  });
});

describe('SupabaseProductsRepository.list', () => {
  it('queries products with the newest order and the first page range by default', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: rows(3) });
    await repo.list({ sort: 'newest' });
    expect(fake.calls).toEqual([
      ['from', 'products'],
      ['select', '*'],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id'],
      ['range', 0, 20],
    ]);
  });

  it('applies every filter', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [] });
    await repo.list({
      sort: 'newest',
      q: '50%_mug',
      categoryId: 'cat-1',
      minCents: 1000,
      maxCents: 5000,
      inStock: true,
    });
    expect(fake.calls).toEqual(
      expect.arrayContaining([
        ['ilike', 'name', '%50\\%\\_mug%'],
        ['eq', 'category_id', 'cat-1'],
        ['gte', 'price_cents', 1000],
        ['lte', 'price_cents', 5000],
        ['gt', 'stock', 0],
      ]),
    );
  });

  it('orders price_asc by price, newest, id', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [] });
    await repo.list({ sort: 'price_asc' });
    expect(fake.calls.filter(([m]) => m === 'order')).toEqual([
      ['order', 'price_cents'],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id'],
    ]);
  });

  it('orders price_desc by price descending, then newest, then id', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [] });
    await repo.list({ sort: 'price_desc' });
    expect(fake.calls.filter(([m]) => m === 'order')).toEqual([
      ['order', 'price_cents', { ascending: false }],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id'],
    ]);
  });

  it('uses the cursor as offset and the page size as range length', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [] });
    await repo.list({ sort: 'newest', cursor: 20, pageSize: 10 });
    expect(fake.calls).toContainEqual(['range', 20, 30]);
  });

  it('returns nextCursor 20 and drops the extra row when 21 rows come back', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: rows(21) });
    const page = await repo.list({ sort: 'newest' });
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBe(20);
  });

  it('returns nextCursor null on the last page', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: rows(10) });
    const page = await repo.list({ sort: 'newest', cursor: 20 });
    expect(page.items).toHaveLength(10);
    expect(page.nextCursor).toBeNull();
  });

  it('maps rows to domain products with public image URLs', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [row(1, { stock: 0 })] });
    const { items } = await repo.list({ sort: 'newest' });
    expect(fake.buckets).toContain('vitrina-products');
    expect(items[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'product-1',
      name: 'Product 1',
      description: 'A product',
      priceCents: 1999,
      currency: 'USD',
      categoryId: '11111111-1111-4111-8111-111111111111',
      imageUrls: [
        'https://storage.test/vitrina-products/product-1-1.webp',
        'https://storage.test/vitrina-products/product-1-2.webp',
      ],
      stock: 0,
      isActive: true,
      createdAt: new Date('2026-09-01T10:00:00+00:00'),
    });
    expect(items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('maps a network failure to a network DomainError', async () => {
    const { fake, repo } = setup();
    fake.respond(new TypeError('Network request failed'));
    await expect(repo.list({ sort: 'newest' })).rejects.toMatchObject({
      info: { code: 'network' },
    });
  });

  it('maps PGRST301 to unauthorized', async () => {
    const { fake, repo } = setup();
    fake.respond({ error: { code: 'PGRST301', message: 'JWT expired' } });
    await expect(repo.list({ sort: 'newest' })).rejects.toMatchObject({
      info: { code: 'unauthorized' },
    });
  });
});

describe('SupabaseProductsRepository.getById', () => {
  it('returns the mapped product', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: row(7) });
    const product = await repo.getById('abc');
    expect(product.name).toBe('Product 7');
    expect(fake.calls).toEqual([
      ['from', 'products'],
      ['select', '*'],
      ['eq', 'id', 'abc'],
      ['maybeSingle'],
    ]);
  });

  it('throws notFound (product) when nothing matches', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: null });
    const error = await repo.getById('abc').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ info: { code: 'notFound', entity: 'product' } });
  });
});

describe('SupabaseProductsRepository.getByIds', () => {
  it('makes no request for an empty list', async () => {
    const { fake, repo } = setup();
    await expect(repo.getByIds([])).resolves.toEqual([]);
    expect(fake.calls).toEqual([]);
  });

  it('filters with in()', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [row(1), row(2)] });
    const products = await repo.getByIds(['a', 'b']);
    expect(products.map((p) => p.slug)).toEqual(['product-1', 'product-2']);
    expect(fake.calls).toContainEqual(['in', 'id', ['a', 'b']]);
  });
});

describe('SupabaseProductsRepository.listCategories', () => {
  it('orders by sort_order and maps to domain categories', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [{ id: 'c1', slug: 'kitchen', name: 'Kitchen', sort_order: 2 }] });
    await expect(repo.listCategories()).resolves.toEqual([
      { id: 'c1', slug: 'kitchen', name: 'Kitchen', sortOrder: 2 },
    ]);
    expect(fake.calls).toEqual([
      ['from', 'categories'],
      ['select', '*'],
      ['order', 'sort_order'],
    ]);
  });
});
