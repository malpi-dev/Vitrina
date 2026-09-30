import { createContext, useContext } from 'react';

import type { CheckoutSession } from '../../domain/checkout-session';
import type { PaymentOutcome } from '../../domain/payment-outcome';

export interface PaymentPresenter {
  /** Collects the payment for a started checkout and reports how it ended (never throws). */
  present(session: CheckoutSession): Promise<PaymentOutcome>;
}

export const PaymentPresenterContext = createContext<PaymentPresenter | null>(null);

export function usePaymentPresenter(): PaymentPresenter {
  const presenter = useContext(PaymentPresenterContext);
  if (!presenter) throw new Error('usePaymentPresenter must be used inside a PaymentPresenterRoot');
  return presenter;
}
