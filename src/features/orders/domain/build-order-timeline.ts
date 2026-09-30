import type { Order } from './order';
import type { OrderStatus } from './order-status';

export type TimelineStepKey = 'placed' | 'paid' | 'shipped' | 'delivered';

export interface TimelineStep {
  key: TimelineStepKey;
  state: 'done' | 'current' | 'upcoming';
  at: Date | null;
}

export interface OrderTimeline {
  steps: TimelineStep[];
  /** Cancellation is shown apart from the steps. */
  canceledAt: Date | null;
}

const STEP_KEYS: TimelineStepKey[] = ['placed', 'paid', 'shipped', 'delivered'];

/** Index of the last step reached by each status (canceled is handled separately). */
const CURRENT_INDEX: Record<Exclude<OrderStatus, 'canceled'>, number> = {
  pending_payment: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
};

export function buildOrderTimeline(
  order: Pick<
    Order,
    'status' | 'createdAt' | 'paidAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'
  >,
): OrderTimeline {
  const dates: Record<TimelineStepKey, Date | null> = {
    placed: order.createdAt,
    paid: order.paidAt,
    shipped: order.shippedAt,
    delivered: order.deliveredAt,
  };

  if (order.status === 'canceled') {
    return {
      steps: STEP_KEYS.map((key, i) => ({
        key,
        state: i === 0 ? 'done' : 'upcoming',
        at: i === 0 ? dates.placed : null,
      })),
      canceledAt: order.canceledAt,
    };
  }

  const current = CURRENT_INDEX[order.status];
  return {
    steps: STEP_KEYS.map((key, i) => ({
      key,
      state: i < current ? 'done' : i === current ? 'current' : 'upcoming',
      at: dates[key],
    })),
    canceledAt: null,
  };
}
