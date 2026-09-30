export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'canceled';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'canceled'],
  paid: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  // Late payment recovery, only via mark_order_paid (see bitacora, "Plan" decisions).
  canceled: ['paid'],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  TRANSITIONS[from].includes(to);
