import type { Order } from './order';

export type LiveStatus = 'live' | 'paused';
export type Unsubscribe = () => void;

export interface OrdersRepository {
  /** Current user's orders, newest first. */
  list(): Promise<Order[]>;
  /** Throws `notFound` (entity 'order'). */
  getById(id: string): Promise<Order>;
  subscribe(
    /** No `orderId` = all orders of the current user. */
    filter: { orderId?: string },
    /** Always a full, fresh Order. */
    onChange: (order: Order) => void,
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe;
}
