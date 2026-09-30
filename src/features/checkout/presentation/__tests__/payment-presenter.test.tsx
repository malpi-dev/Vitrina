import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSessionStore } from '@/core/session';
import { routerMock } from '@/test/expo-router-mock';

import { PaymentPresenterRoot, usePaymentPresenter } from '../payment/payment-presenter';
import { useSimulatedPaymentStore } from '../payment/simulated-payment.store';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <PaymentPresenterRoot>{children}</PaymentPresenterRoot>
);

describe('PaymentPresenterRoot', () => {
  beforeEach(() => {
    routerMock.reset();
    useSimulatedPaymentStore.setState({ pending: null });
  });

  it('throws without a provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => usePaymentPresenter())).rejects.toThrow(/PaymentPresenterRoot/);
    jest.restoreAllMocks();
  });

  it('demo: opens the simulated sheet and resolves with the choice', async () => {
    useSessionStore.setState({ isDemo: true });
    const { result } = await renderHook(() => usePaymentPresenter(), { wrapper });
    const outcome = result.current.present({ orderId: 'o1', totalCents: 100 });
    expect(routerMock.push).toHaveBeenCalledWith('/checkout/simulated-payment');
    useSimulatedPaymentStore.getState().settle({ status: 'succeeded' });
    await expect(outcome).resolves.toEqual({ status: 'succeeded' });
  });

  it('live: the placeholder reports that cards are not configured yet', async () => {
    useSessionStore.setState({ isDemo: false });
    const { result } = await renderHook(() => usePaymentPresenter(), { wrapper });
    await expect(result.current.present({ orderId: 'o1', totalCents: 100 })).resolves.toEqual({
      status: 'failed',
      reason: 'Card payments are not configured yet',
    });
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
