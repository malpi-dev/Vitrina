import type { CheckoutItemInput } from './checkout-items';
import type { CheckoutSession } from './checkout-session';
import type { PaymentOutcome } from './payment-outcome';
import type { ShippingAddress } from './shipping-address';

export interface StartCheckoutInput {
  items: CheckoutItemInput[];
  shippingAddress: ShippingAddress;
}

export interface CheckoutRepository {
  /** Creates the order with server prices and (live) the PaymentIntent. Throws outOfStock/productUnavailable/validation. */
  startCheckout(input: StartCheckoutInput): Promise<CheckoutSession>;
  /** Live: no-op (only the Stripe webhook marks orders as paid). Mock: drives the simulated order lifecycle. */
  reportPaymentResult(orderId: string, outcome: PaymentOutcome): Promise<void>;
}
