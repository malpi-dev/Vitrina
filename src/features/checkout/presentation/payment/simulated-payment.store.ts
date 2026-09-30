import { create } from 'zustand';

import type { CheckoutSession } from '../../domain/checkout-session';
import type { PaymentOutcome } from '../../domain/payment-outcome';

interface PendingPayment {
  session: CheckoutSession;
  resolve: (outcome: PaymentOutcome) => void;
}

interface SimulatedPaymentState {
  pending: PendingPayment | null;
  /** Starts a simulated payment; resolves when the sheet calls `settle`. */
  open: (session: CheckoutSession) => Promise<PaymentOutcome>;
  /** Resolves the pending payment exactly once; later calls do nothing. */
  settle: (outcome: PaymentOutcome) => void;
}

/** Not persisted: a payment in flight never survives a restart. */
export const useSimulatedPaymentStore = create<SimulatedPaymentState>()((set, get) => ({
  pending: null,
  open: (session) =>
    new Promise<PaymentOutcome>((resolve) => {
      // A sheet that was never settled counts as canceled.
      get().settle({ status: 'canceled' });
      set({ pending: { session, resolve } });
    }),
  settle: (outcome) => {
    const { pending } = get();
    if (!pending) return;
    set({ pending: null });
    pending.resolve(outcome);
  },
}));
