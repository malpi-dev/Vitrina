import { describeOrdersRepositoryContract } from '@/test/contracts/orders-repository.contract';
import { DEMO_PROFILE } from '@/features/demo/data/fixtures';
import { MockStore } from '@/features/demo/data/mock-store';

import { MockOrdersRepository } from '../mock-orders.repository';

const MUG = '00000000-0000-4000-8000-000000000207';

describeOrdersRepositoryContract('mock', () => {
  const store = new MockStore({ latencyMs: [0, 0] });
  return {
    repository: new MockOrdersRepository(store),
    createOrder: () => {
      return Promise.resolve(
        store.createOrder({
          items: [{ productId: MUG, quantity: 1 }],
          shippingAddress: DEMO_PROFILE.defaultAddress!,
        }),
      );
    },
    advance: (orderId) => {
      const { status } = store.orders.find((o) => o.id === orderId)!;
      if (status === 'pending_payment') store.setStatus(orderId, 'paid');
      else store.recordPaymentFailure(orderId, 'touched');
      return Promise.resolve();
    },
    cleanup: () => store.dispose(),
  };
});

describe('MockOrdersRepository specifics', () => {
  it('failNext makes the next call fail', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const repo = new MockOrdersRepository(store);
    store.failNext({ code: 'network' });
    await expect(repo.list()).rejects.toMatchObject({ info: { code: 'network' } });
    await expect(repo.list()).resolves.toHaveLength(3);
  });

  it('returns copies that cannot mutate the store', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const repo = new MockOrdersRepository(store);
    const [first] = await repo.list();
    first!.items[0]!.quantity = 99;
    first!.status = 'canceled';
    const [again] = await repo.list();
    expect(again!.status).not.toBe('canceled');
    expect(again!.items[0]!.quantity).not.toBe(99);
  });
});
