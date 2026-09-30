import { DEMO_PROFILE } from '@/features/demo/data/fixtures';
import { MockStore } from '@/features/demo/data/mock-store';

import { MockCheckoutRepository } from '../mock-checkout.repository';

const MUG = '00000000-0000-4000-8000-000000000207';
const GRINDER = '00000000-0000-4000-8000-000000000212';
const OUT = '00000000-0000-4000-8000-000000000206';

const setup = () => {
  const store = new MockStore({ latencyMs: [0, 0] });
  return { store, repo: new MockCheckoutRepository(store) };
};
const input = (productId: string, quantity: number) => ({
  items: [{ productId, quantity }],
  shippingAddress: DEMO_PROFILE.defaultAddress!,
});
const stock = (store: MockStore, id: string) => store.products.find((p) => p.id === id)!.stock;

describe('MockCheckoutRepository', () => {
  afterEach(() => jest.useRealTimers());

  it('creates the order without clientSecret and discounts stock', async () => {
    const { repo, store } = setup();
    const session = await repo.startCheckout(input(MUG, 2));
    expect(session.clientSecret).toBeUndefined();
    expect(session.totalCents).toBe(4899);
    const order = store.orders.find((o) => o.id === session.orderId)!;
    expect(order.status).toBe('pending_payment');
    expect(stock(store, MUG)).toBe(23);
  });

  it('throws outOfStock with the ids', async () => {
    const { repo } = setup();
    await expect(repo.startCheckout(input(OUT, 1))).rejects.toMatchObject({
      info: { code: 'outOfStock', productIds: [OUT] },
    });
  });

  it('a second checkout cancels the first and restores its stock', async () => {
    const { repo, store } = setup();
    const first = await repo.startCheckout(input(MUG, 4));
    const second = await repo.startCheckout(input(MUG, 1));
    expect(store.orders.find((o) => o.id === first.orderId)!.status).toBe('canceled');
    expect(store.orders.find((o) => o.id === second.orderId)!.status).toBe('pending_payment');
    expect(stock(store, MUG)).toBe(24);
    await repo.startCheckout(input(GRINDER, 1));
    expect(stock(store, MUG)).toBe(25);
  });

  it('a succeeded payment drives paid (2 s), shipped (8 s) and delivered (15 s)', async () => {
    jest.useFakeTimers();
    const { repo, store } = setup();
    const { orderId } = await repo.startCheckout(input(MUG, 1));
    const status = () => store.orders.find((o) => o.id === orderId)!.status;
    await repo.reportPaymentResult(orderId, { status: 'succeeded' });
    expect(status()).toBe('pending_payment');
    jest.advanceTimersByTime(2000);
    expect(status()).toBe('paid');
    jest.advanceTimersByTime(6000);
    expect(status()).toBe('shipped');
    jest.advanceTimersByTime(7000);
    expect(status()).toBe('delivered');
  });

  it('a failed payment records the reason; a canceled one does nothing', async () => {
    jest.useFakeTimers();
    const { repo, store } = setup();
    const { orderId } = await repo.startCheckout(input(MUG, 1));
    const order = () => store.orders.find((o) => o.id === orderId)!;
    await repo.reportPaymentResult(orderId, { status: 'canceled' });
    expect(order().lastPaymentError).toBeNull();
    await repo.reportPaymentResult(orderId, {
      status: 'failed',
      reason: 'Card declined (simulated)',
    });
    expect(order().lastPaymentError).toBe('Card declined (simulated)');
    jest.advanceTimersByTime(20000);
    expect(order().status).toBe('pending_payment');
  });

  it('failNext makes the next call fail', async () => {
    const { repo, store } = setup();
    store.failNext({ code: 'network' });
    await expect(repo.startCheckout(input(MUG, 1))).rejects.toMatchObject({
      info: { code: 'network' },
    });
    expect(stock(store, MUG)).toBe(25);
  });
});
