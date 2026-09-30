import { DomainError } from '@/core/errors';
import { clone } from '@/features/demo/data/clone';
import type { MockStore } from '@/features/demo/data/mock-store';

import type { Order } from '../domain/order';
import type { LiveStatus, OrdersRepository, Unsubscribe } from '../domain/orders.repository';

export class MockOrdersRepository implements OrdersRepository {
  constructor(private readonly store: MockStore) {}

  async list(): Promise<Order[]> {
    await this.store.delay();
    this.store.takeFailure();
    const mine = this.store.orders
      .filter((o) => o.userId === this.store.user.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return clone(mine);
  }

  async getById(id: string): Promise<Order> {
    await this.store.delay();
    this.store.takeFailure();
    const order = this.store.orders.find((o) => o.id === id && o.userId === this.store.user.id);
    if (!order) throw new DomainError({ code: 'notFound', entity: 'order' });
    return clone(order);
  }

  subscribe(
    filter: { orderId?: string },
    onChange: (order: Order) => void,
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe {
    onStatus?.('live');
    return this.store.onOrderChange((order) => {
      if (filter.orderId === undefined || order.id === filter.orderId) onChange(order);
    });
  }
}
