import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { MAX_LINES } from '../../domain/cart-item';
import { buildDemoProducts } from '@/features/demo/data/fixtures';
import { migrateCart, useCartStore, useCartTotals, useCartUnitCount } from '../cart.store';

const products = buildDemoProducts();
const inStock = products.filter((p) => p.stock >= 10);
const [a, b] = inStock as [(typeof products)[number], (typeof products)[number]];

describe('cart.store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useCartStore.setState({ items: [] });
  });

  it('adds, merges, updates and removes lines', () => {
    const { add, setQuantity, remove } = useCartStore.getState();
    expect(add(a, 2).outcome).toBe('added');
    expect(add(a, 1).outcome).toBe('merged');
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
    add(b, 1);
    setQuantity(a.id, 5);
    expect(useCartStore.getState().items.map((i) => i.quantity)).toEqual([5, 1]);
    remove(a.id);
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual([b.id]);
  });

  it('keeps the cart untouched when the add is rejected', () => {
    const soldOut = products.find((p) => p.stock === 0)!;
    const before = useCartStore.getState().items;
    expect(useCartStore.getState().add(soldOut, 1)).toMatchObject({
      outcome: 'rejected',
      reason: 'outOfStock',
    });
    expect(useCartStore.getState().items).toBe(before);
  });

  it(`rejects a new line past ${MAX_LINES} lines`, () => {
    const many = products.filter((p) => p.stock > 0).slice(0, MAX_LINES + 1);
    let last = '';
    for (const p of many) {
      const r = useCartStore.getState().add(p, 1);
      last = r.outcome === 'rejected' ? r.reason : r.outcome;
    }
    expect(useCartStore.getState().items).toHaveLength(MAX_LINES);
    expect(last).toBe('tooManyLines');
  });

  it('exposes unit count and totals', async () => {
    useCartStore.getState().add(a, 2);
    useCartStore.getState().add(b, 1);
    const count = await renderHook(() => useCartUnitCount());
    const totals = await renderHook(() => useCartTotals());
    expect(count.result.current).toBe(3);
    expect(totals.result.current.subtotalCents).toBe(a.priceCents * 2 + b.priceCents);
  });

  it('persists to storage and rehydrates', async () => {
    useCartStore.getState().add(a, 2);
    const raw = await AsyncStorage.getItem('vitrina-cart');
    expect(JSON.parse(raw!).version).toBe(1);

    useCartStore.setState({ items: [] }); // simulates a fresh process, storage keeps the data
    await AsyncStorage.setItem('vitrina-cart', raw!);
    await act(async () => {
      await useCartStore.persist.rehydrate();
    });
    expect(useCartStore.getState().items).toMatchObject([{ productId: a.id, quantity: 2 }]);
  });

  it('starts empty when the stored data is corrupt', async () => {
    await AsyncStorage.setItem(
      'vitrina-cart',
      JSON.stringify({ state: { items: [{ productId: 1 }] }, version: 1 }),
    );
    await act(async () => {
      await useCartStore.persist.rehydrate();
    });
    expect(useCartStore.getState().items).toEqual([]);
  });

  describe('migrateCart', () => {
    it('keeps valid v1 data', () => {
      useCartStore.getState().add(a, 1);
      const { items } = useCartStore.getState();
      expect(migrateCart({ items }, 1)).toEqual({ items });
    });
    it.each([
      ['unknown version', { items: [] }, 7],
      ['wrong shape', { items: 'nope' }, 1],
      ['null', null, 1],
      ['quantity out of range', { items: [{ productId: 'x', quantity: 99 }] }, 1],
    ])('returns an empty cart for %s', (_label, data, version) => {
      expect(migrateCart(data, version)).toEqual({ items: [] });
    });
  });
});
