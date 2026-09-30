import { DomainError } from '@/core/errors';
import { DEFAULT_SHIPPING_POLICY } from '@/features/cart/domain/shipping-policy';
import type { StartCheckoutInput } from '@/features/checkout/domain/checkout.repository';
import type { Order } from '@/features/orders/domain/order';

import { DEMO_PROFILE } from '../fixtures';
import { MockStore } from '../mock-store';

const MUG = '00000000-0000-4000-8000-000000000207'; // Ivory Stoneware Mug, $22.00, stock 25
const GRINDER = '00000000-0000-4000-8000-000000000212'; // $120.00, stock 1
const OUT_OF_STOCK = '00000000-0000-4000-8000-000000000206'; // Chai Spice Mix, stock 0
const address = DEMO_PROFILE.defaultAddress!;

const input = (...items: [string, number][]): StartCheckoutInput => ({
  items: items.map(([productId, quantity]) => ({ productId, quantity })),
  shippingAddress: address,
});

const newStore = () => new MockStore({ latencyMs: [0, 0] });
const stockOf = (store: MockStore, id: string) => store.products.find((p) => p.id === id)!.stock;
const errorOf = (fn: () => unknown): DomainError => {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error('Expected a DomainError');
};

describe('MockStore', () => {
  afterEach(() => jest.useRealTimers());

  it('starts with the catalog, the demo profile and the 3 sample orders', () => {
    const store = newStore();
    expect(store.products).toHaveLength(30);
    expect(store.categories).toHaveLength(5);
    expect(store.orders.map((o) => o.shortCode)).toEqual(['VT-DM24', 'VT-DM37', 'VT-DM59']);
    expect(store.profile).toEqual(DEMO_PROFILE);
    expect(store.profile).not.toBe(DEMO_PROFILE);
  });

  describe('createOrder', () => {
    it('freezes names and prices, applies shipping and discounts stock', () => {
      const store = newStore();
      const order = store.createOrder(input([MUG, 2]));
      expect(order.status).toBe('pending_payment');
      expect(order.shortCode).toMatch(/^VT-[2-9A-HJKMNP-TV-Z]{4}$/);
      expect(order.items).toEqual([
        {
          productId: MUG,
          productName: 'Ivory Stoneware Mug',
          unitPriceCents: 2200,
          quantity: 2,
          lineTotalCents: 4400,
        },
      ]);
      expect(order.subtotalCents).toBe(4400);
      expect(order.shippingCents).toBe(DEFAULT_SHIPPING_POLICY.flatCents);
      expect(order.totalCents).toBe(4899);
      expect(stockOf(store, MUG)).toBe(23);
      expect(store.orders).toHaveLength(4);
    });

    it('has free shipping from $50.00 (and not at $49.99)', () => {
      const store = newStore();
      expect(store.createOrder(input([MUG, 3])).shippingCents).toBe(0); // $66.00
    });

    it('rejects invalid items and addresses with `validation`', () => {
      const store = newStore();
      expect(errorOf(() => store.createOrder(input())).code).toBe('validation');
      expect(errorOf(() => store.createOrder(input([MUG, 11]))).code).toBe('validation');
      const bad = errorOf(() =>
        store.createOrder({ ...input([MUG, 1]), shippingAddress: { ...address, postalCode: '!' } }),
      );
      expect(bad.info).toMatchObject({
        code: 'validation',
        fields: { postalCode: expect.any(String) },
      });
      expect(stockOf(store, MUG)).toBe(25);
    });

    it('throws productUnavailable for unknown ids', () => {
      const store = newStore();
      const missing = '00000000-0000-4000-8000-00000000ffff';
      const error = errorOf(() => store.createOrder(input([MUG, 1], [missing, 1])));
      expect(error.info).toEqual({ code: 'productUnavailable', productIds: [missing] });
    });

    it('throws productUnavailable for inactive products', () => {
      const store = newStore();
      store.products.find((p) => p.id === MUG)!.isActive = false;
      expect(errorOf(() => store.createOrder(input([MUG, 1]))).code).toBe('productUnavailable');
    });

    it('throws outOfStock with the product ids and leaves the stock untouched', () => {
      const store = newStore();
      const error = errorOf(() =>
        store.createOrder(input([MUG, 1], [GRINDER, 2], [OUT_OF_STOCK, 1])),
      );
      expect(error.info).toEqual({ code: 'outOfStock', productIds: [GRINDER, OUT_OF_STOCK] });
      expect(stockOf(store, MUG)).toBe(25);
      expect(stockOf(store, GRINDER)).toBe(1);
    });

    it('cancels the previous pending order and restores its stock', () => {
      const store = newStore();
      const first = store.createOrder(input([GRINDER, 1]));
      expect(stockOf(store, GRINDER)).toBe(0);
      // Asking for the last unit again is valid: the previous reservation is released first.
      const second = store.createOrder(input([GRINDER, 1]));
      expect(store.orders.find((o) => o.id === first.id)!.status).toBe('canceled');
      expect(store.orders.find((o) => o.id === first.id)!.canceledAt).not.toBeNull();
      expect(second.status).toBe('pending_payment');
      expect(stockOf(store, GRINDER)).toBe(0);
    });

    it('notifies listeners with copies', () => {
      const store = newStore();
      const seen: Order[] = [];
      store.onOrderChange((o) => seen.push(o));
      const order = store.createOrder(input([MUG, 1]));
      expect(seen).toHaveLength(1);
      expect(seen[0]).toEqual(order);
      seen[0]!.items[0]!.quantity = 99;
      expect(store.orders.find((o) => o.id === order.id)!.items[0]!.quantity).toBe(1);
    });
  });

  describe('setStatus', () => {
    it('stamps the timestamps and notifies', () => {
      const now = new Date('2026-10-05T10:00:00.000Z');
      const store = new MockStore({ latencyMs: [0, 0], now: () => now });
      const seen: string[] = [];
      store.onOrderChange((o) => seen.push(o.status));
      const { id } = store.createOrder(input([MUG, 1]));
      expect(store.setStatus(id, 'paid').paidAt).toEqual(now);
      expect(store.setStatus(id, 'shipped').shippedAt).toEqual(now);
      expect(store.setStatus(id, 'delivered').deliveredAt).toEqual(now);
      expect(seen).toEqual(['pending_payment', 'paid', 'shipped', 'delivered']);
    });

    it('throws conflict on an invalid transition and notFound on an unknown order', () => {
      const store = newStore();
      const { id } = store.createOrder(input([MUG, 1]));
      expect(errorOf(() => store.setStatus(id, 'delivered')).code).toBe('conflict');
      expect(errorOf(() => store.setStatus('nope', 'paid')).info).toEqual({
        code: 'notFound',
        entity: 'order',
      });
    });

    it('restores stock when an order is canceled', () => {
      const store = newStore();
      const { id } = store.createOrder(input([MUG, 4]));
      store.setStatus(id, 'canceled');
      expect(stockOf(store, MUG)).toBe(25);
    });
  });

  describe('lifecycle', () => {
    it('goes paid (2 s), shipped (8 s) and delivered (15 s) after startLifecycle', () => {
      jest.useFakeTimers();
      const store = newStore();
      const { id } = store.createOrder(input([MUG, 1]));
      const status = () => store.orders.find((o) => o.id === id)!.status;
      store.startLifecycle(id);
      expect(status()).toBe('pending_payment');
      jest.advanceTimersByTime(1999);
      expect(status()).toBe('pending_payment');
      jest.advanceTimersByTime(1);
      expect(status()).toBe('paid');
      jest.advanceTimersByTime(6000);
      expect(status()).toBe('shipped');
      jest.advanceTimersByTime(7000);
      expect(status()).toBe('delivered');
    });

    it('does not pay an order that was canceled in the meantime', () => {
      jest.useFakeTimers();
      const store = newStore();
      const { id } = store.createOrder(input([MUG, 1]));
      store.startLifecycle(id);
      store.setStatus(id, 'canceled');
      jest.advanceTimersByTime(20000);
      expect(store.orders.find((o) => o.id === id)!.status).toBe('canceled');
    });

    it('dispose clears pending timers and listeners', () => {
      jest.useFakeTimers();
      const store = newStore();
      const listener = jest.fn();
      store.onOrderChange(listener);
      const { id } = store.createOrder(input([MUG, 1]));
      listener.mockClear();
      store.startLifecycle(id);
      store.dispose();
      jest.advanceTimersByTime(20000);
      expect(store.orders.find((o) => o.id === id)!.status).toBe('pending_payment');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  it('records a payment failure and notifies', () => {
    const store = newStore();
    const { id } = store.createOrder(input([MUG, 1]));
    const listener = jest.fn();
    store.onOrderChange(listener);
    store.recordPaymentFailure(id, 'Card declined (simulated)');
    expect(store.orders.find((o) => o.id === id)!.lastPaymentError).toBe(
      'Card declined (simulated)',
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('failNext makes exactly the next call throw', () => {
    const store = newStore();
    store.failNext({ code: 'network' });
    expect(errorOf(() => store.takeFailure()).code).toBe('network');
    expect(() => store.takeFailure()).not.toThrow();
  });

  it('delay resolves immediately with [0, 0] and waits otherwise', async () => {
    jest.useFakeTimers();
    await newStore().delay();
    const slow = new MockStore({ latencyMs: [300, 300] });
    let done = false;
    void slow.delay().then(() => (done = true));
    await jest.advanceTimersByTimeAsync(299);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});
