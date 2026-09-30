import type { ReactNode } from 'react';

import { useIsDemo } from '@/core/session';

import { SimulatedPaymentProvider } from './simulated-payment-provider';
import { StripePaymentProvider } from './stripe-payment-provider';

export {
  PaymentPresenterContext,
  usePaymentPresenter,
  type PaymentPresenter,
} from './payment-presenter-context';

/**
 * One provider per mode, so each tree only calls its own hooks (`useStripe` needs StripeProvider,
 * which only exists in live mode). The tree remounts when the mode changes.
 */
export function PaymentPresenterRoot({ children }: { children: ReactNode }) {
  const isDemo = useIsDemo();
  return isDemo ? (
    <SimulatedPaymentProvider>{children}</SimulatedPaymentProvider>
  ) : (
    <StripePaymentProvider>{children}</StripePaymentProvider>
  );
}
