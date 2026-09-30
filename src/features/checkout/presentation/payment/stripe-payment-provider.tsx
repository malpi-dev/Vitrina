import type { ReactNode } from 'react';

import { PaymentPresenterContext, type PaymentPresenter } from './payment-presenter-context';

// Placeholder: phase 11 replaces it with the Stripe PaymentSheet (the only place allowed to import @stripe/*).
const presenter: PaymentPresenter = {
  present: () =>
    Promise.resolve({ status: 'failed', reason: 'Card payments are not configured yet' }),
};

export function StripePaymentProvider({ children }: { children: ReactNode }) {
  return (
    <PaymentPresenterContext.Provider value={presenter}>
      {children}
    </PaymentPresenterContext.Provider>
  );
}
