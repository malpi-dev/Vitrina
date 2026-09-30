import type { PaymentOutcome } from '../../domain/payment-outcome';
import { useSimulatedPaymentStore } from '../payment/simulated-payment.store';

const session = { orderId: 'o1', totalCents: 1234 };

describe('simulated payment store', () => {
  beforeEach(() => useSimulatedPaymentStore.setState({ pending: null }));

  it('resolves the pending payment once and clears it', async () => {
    const promise = useSimulatedPaymentStore.getState().open(session);
    expect(useSimulatedPaymentStore.getState().pending?.session).toEqual(session);
    useSimulatedPaymentStore.getState().settle({ status: 'succeeded' });
    useSimulatedPaymentStore.getState().settle({ status: 'failed', reason: 'late' });
    await expect(promise).resolves.toEqual({ status: 'succeeded' });
    expect(useSimulatedPaymentStore.getState().pending).toBeNull();
  });

  it('does nothing when there is no pending payment', () => {
    expect(() => useSimulatedPaymentStore.getState().settle({ status: 'canceled' })).not.toThrow();
  });

  it('cancels a previous payment that was never settled', async () => {
    const first = useSimulatedPaymentStore.getState().open(session);
    const second = useSimulatedPaymentStore.getState().open({ ...session, orderId: 'o2' });
    await expect(first).resolves.toEqual<PaymentOutcome>({ status: 'canceled' });
    expect(useSimulatedPaymentStore.getState().pending?.session.orderId).toBe('o2');
    useSimulatedPaymentStore.getState().settle({ status: 'succeeded' });
    await expect(second).resolves.toEqual({ status: 'succeeded' });
  });
});
