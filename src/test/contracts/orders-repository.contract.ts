import type { Order } from '@/features/orders/domain/order';
import type { OrdersRepository } from '@/features/orders/domain/orders.repository';

export interface OrdersContractContext {
  repository: OrdersRepository;
  /** Creates a new order for the current user (and makes it emit a change). */
  createOrder(): Promise<Order>;
  /** Makes an existing order emit a change to subscribers (status change or payment error). */
  advance(orderId: string): Promise<void>;
  cleanup?(): void;
}

/**
 * Behavior every OrdersRepository implementation must have (mock today; supabase in phase 09).
 * `setup` builds a fresh repository seeded with the 3 sample orders.
 */
export function describeOrdersRepositoryContract(
  name: string,
  setup: () => OrdersContractContext | Promise<OrdersContractContext>,
) {
  describe(`OrdersRepository contract: ${name}`, () => {
    let ctx: OrdersContractContext;

    beforeEach(async () => {
      ctx = await setup();
    });
    afterEach(() => ctx.cleanup?.());

    it('list returns the user orders, newest first', async () => {
      const orders = await ctx.repository.list();
      expect(orders.length).toBeGreaterThanOrEqual(3);
      const times = orders.map((o) => o.createdAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    });

    it('getById returns the order and throws notFound otherwise', async () => {
      const [first] = await ctx.repository.list();
      await expect(ctx.repository.getById(first!.id)).resolves.toEqual(first);
      await expect(
        ctx.repository.getById('00000000-0000-4000-8000-00000000ffff'),
      ).rejects.toMatchObject({ info: { code: 'notFound', entity: 'order' } });
    });

    it('subscribe reports live status right away', () => {
      const onStatus = jest.fn();
      const unsubscribe = ctx.repository.subscribe({}, jest.fn(), onStatus);
      expect(onStatus).toHaveBeenCalledWith('live');
      unsubscribe();
    });

    it('subscribe with an orderId only receives changes of that order', async () => {
      const target = await ctx.createOrder();
      const other = await ctx.createOrder();
      const received: Order[] = [];
      const unsubscribe = ctx.repository.subscribe({ orderId: target.id }, (o) => received.push(o));
      await ctx.advance(other.id);
      expect(received).toHaveLength(0);
      await ctx.advance(target.id);
      expect(received.map((o) => o.id)).toEqual([target.id]);
      unsubscribe();
    });

    it('subscribe without filter receives changes of any order of the user', async () => {
      const a = await ctx.createOrder();
      const received: string[] = [];
      const unsubscribe = ctx.repository.subscribe({}, (o) => received.push(o.id));
      await ctx.advance(a.id);
      const b = await ctx.createOrder();
      expect(received).toContain(a.id);
      expect(received).toContain(b.id);
      unsubscribe();
    });

    it('stops receiving after unsubscribe', async () => {
      const order = await ctx.createOrder();
      const onChange = jest.fn();
      const unsubscribe = ctx.repository.subscribe({ orderId: order.id }, onChange);
      unsubscribe();
      await ctx.advance(order.id);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
}
