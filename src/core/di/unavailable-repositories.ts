import { DomainError } from '@/core/errors';
import type { CheckoutRepository } from '@/features/checkout/domain/checkout.repository';
import type { OrdersRepository } from '@/features/orders/domain/orders.repository';

// Placeholders for live repositories that do not exist yet. Each phase replaces one:
// orders (09), checkout (11, when this file is deleted).
const notAvailable = (): never => {
  throw new DomainError({ code: 'unknown' }, 'Not available yet');
};
const rejected = (): Promise<never> =>
  Promise.reject(new DomainError({ code: 'unknown' }, 'Not available yet'));

export const unavailableCheckout: CheckoutRepository = {
  startCheckout: rejected,
  reportPaymentResult: rejected,
};

export const unavailableOrders: OrdersRepository = {
  list: rejected,
  getById: rejected,
  subscribe: notAvailable,
};
