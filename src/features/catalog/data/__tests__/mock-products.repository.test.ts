import { MockStore } from '@/features/demo/data/mock-store';

import { MockProductsRepository } from '../mock-products.repository';

const setup = () => {
  const store = new MockStore({ latencyMs: [0, 0] });
  return { store, repo: new MockProductsRepository(store) };
};
const COFFEE = '00000000-0000-4000-8000-000000000101';
const KITCHEN = '00000000-0000-4000-8000-000000000102';

describe('MockProductsRepository', () => {
  it('searches by name: "mug" finds 3 products', async () => {
    const { repo } = setup();
    const page = await repo.list({ sort: 'newest', q: 'mug' });
    expect(page.items.map((p) => p.name).sort()).toEqual([
      'Insulated Travel Mug',
      'Ivory Stoneware Mug',
      'Terracotta Stoneware Mug',
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it('combines filters', async () => {
    const { repo } = setup();
    const page = await repo.list({
      sort: 'price_asc',
      categoryId: KITCHEN,
      minCents: 2500,
      maxCents: 9000,
      inStock: true,
    });
    expect(page.items.every((p) => p.categoryId === KITCHEN && p.stock > 0)).toBe(true);
    expect(page.items.every((p) => p.priceCents >= 2500 && p.priceCents <= 9000)).toBe(true);
    expect(page.items.map((p) => p.name)).toEqual([
      'Glass Carafe 600 ml',
      'Ceramic Pour-Over Dripper',
      'Gooseneck Kettle',
    ]);
    const coffeeOnly = await repo.list({ sort: 'newest', categoryId: COFFEE });
    expect(coffeeOnly.items).toHaveLength(6);
  });

  it('applies the three sort orders', async () => {
    const { repo } = setup();
    const newest = (await repo.list({ sort: 'newest' })).items;
    const dates = newest.map((p) => p.createdAt.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));

    const asc = (await repo.list({ sort: 'price_asc' })).items.map((p) => p.priceCents);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(asc[0]).toBe(600);

    const desc = (await repo.list({ sort: 'price_desc' })).items.map((p) => p.priceCents);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(desc[0]).toBe(12000);
  });

  it('paginates 30 products as 20 + 10 with nextCursor', async () => {
    const { repo } = setup();
    const first = await repo.list({ sort: 'newest' });
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).toBe(20);
    const second = await repo.list({ sort: 'newest', cursor: first.nextCursor! });
    expect(second.items).toHaveLength(10);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((p) => p.id)).size).toBe(30);
  });

  it('honors pageSize', async () => {
    const { repo } = setup();
    const page = await repo.list({ sort: 'newest', pageSize: 5 });
    expect(page.items).toHaveLength(5);
    expect(page.nextCursor).toBe(5);
  });

  it('getById returns a product and throws notFound for unknown or inactive ones', async () => {
    const { repo, store } = setup();
    const id = '00000000-0000-4000-8000-000000000207';
    await expect(repo.getById(id)).resolves.toMatchObject({ name: 'Ivory Stoneware Mug' });
    await expect(repo.getById('00000000-0000-4000-8000-00000000ffff')).rejects.toMatchObject({
      info: { code: 'notFound', entity: 'product' },
    });
    store.products.find((p) => p.id === id)!.isActive = false;
    await expect(repo.getById(id)).rejects.toMatchObject({ info: { code: 'notFound' } });
  });

  it('getByIds returns only active products and never throws notFound', async () => {
    const { repo, store } = setup();
    const a = '00000000-0000-4000-8000-000000000201';
    const b = '00000000-0000-4000-8000-000000000202';
    store.products.find((p) => p.id === b)!.isActive = false;
    const found = await repo.getByIds([a, b, '00000000-0000-4000-8000-00000000ffff']);
    expect(found.map((p) => p.id)).toEqual([a]);
  });

  it('lists the 5 categories by sortOrder', async () => {
    const { repo, store } = setup();
    store.categories.reverse();
    const categories = await repo.listCategories();
    expect(categories.map((c) => c.slug)).toEqual([
      'coffee',
      'kitchen',
      'stationery',
      'accessories',
      'home',
    ]);
  });

  it('failNext makes the next call fail, then recovers', async () => {
    const { repo, store } = setup();
    store.failNext({ code: 'network' });
    await expect(repo.list({ sort: 'newest' })).rejects.toMatchObject({
      info: { code: 'network' },
    });
    await expect(repo.list({ sort: 'newest' })).resolves.toBeDefined();
  });

  it('returns copies that cannot mutate the store', async () => {
    const { repo } = setup();
    const page = await repo.list({ sort: 'newest' });
    page.items[0]!.stock = -1;
    const again = await repo.list({ sort: 'newest' });
    expect(again.items[0]!.stock).not.toBe(-1);
  });
});
