import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';

import { PaymentPresenterContext, type PaymentPresenter } from './payment-presenter-context';
import { useSimulatedPaymentStore } from './simulated-payment.store';

/** Demo mode: opens the "Simulated payment" sheet and resolves with the user's choice. */
export function SimulatedPaymentProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const presenter = useMemo<PaymentPresenter>(
    () => ({
      present: (session) => {
        const outcome = useSimulatedPaymentStore.getState().open(session);
        router.push('/checkout/simulated-payment');
        return outcome;
      },
    }),
    [router],
  );
  return (
    <PaymentPresenterContext.Provider value={presenter}>
      {children}
    </PaymentPresenterContext.Provider>
  );
}
