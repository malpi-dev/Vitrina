import type { MockStore } from '@/features/demo/data/mock-store';

import type { CheckoutRepository, StartCheckoutInput } from '../domain/checkout.repository';
import type { CheckoutSession } from '../domain/checkout-session';
import type { PaymentOutcome } from '../domain/payment-outcome';

export class MockCheckoutRepository implements CheckoutRepository {
  constructor(private readonly store: MockStore) {}

  async startCheckout(input: StartCheckoutInput): Promise<CheckoutSession> {
    await this.store.delay();
    this.store.takeFailure();
    const order = this.store.createOrder(input);
    return { orderId: order.id, totalCents: order.totalCents };
  }

  async reportPaymentResult(orderId: string, outcome: PaymentOutcome): Promise<void> {
    await this.store.delay();
    this.store.takeFailure();
    if (outcome.status === 'succeeded') this.store.startLifecycle(orderId);
    else if (outcome.status === 'failed') this.store.recordPaymentFailure(orderId, outcome.reason);
  }
}
