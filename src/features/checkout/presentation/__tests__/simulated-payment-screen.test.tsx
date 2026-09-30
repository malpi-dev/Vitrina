import { act, fireEvent, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import type { PaymentOutcome } from '../../domain/payment-outcome';
import { useSimulatedPaymentStore } from '../payment/simulated-payment.store';
import SimulatedPaymentScreen from '../screens/simulated-payment-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

function openPayment(): Promise<PaymentOutcome> {
  return useSimulatedPaymentStore.getState().open({ orderId: 'o1', totalCents: 5499 });
}

describe('SimulatedPaymentScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: true });
    useSimulatedPaymentStore.setState({ pending: null });
  });

  it('shows the notice, the total and the fake card', async () => {
    void openPayment();
    await renderWithProviders(<SimulatedPaymentScreen />);
    expect(screen.getByTestId('simulated-payment-notice')).toHaveTextContent(
      'Demo mode — no real charge',
    );
    expect(screen.getByTestId('simulated-payment-total')).toHaveTextContent('$54.99');
    expect(screen.getByText('•••• 4242')).toBeOnTheScreen();
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it('succeeds after the 1 s spinner: closes the sheet, then resolves', async () => {
    jest.useFakeTimers();
    try {
      const outcome = openPayment();
      await renderWithProviders(<SimulatedPaymentScreen />);
      await fireEvent.press(screen.getByTestId('simulated-pay-button'));
      expect(routerMock.back).not.toHaveBeenCalled();
      await act(() => jest.advanceTimersByTimeAsync(1000));
      expect(routerMock.back).toHaveBeenCalledTimes(1);
      await expect(outcome).resolves.toEqual({ status: 'succeeded' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails with the simulated decline reason', async () => {
    const outcome = openPayment();
    await renderWithProviders(<SimulatedPaymentScreen />);
    await fireEvent.press(screen.getByTestId('simulated-fail-button'));
    expect(routerMock.back).toHaveBeenCalledTimes(1);
    await expect(outcome).resolves.toEqual({
      status: 'failed',
      reason: 'Card declined (simulated)',
    });
  });

  it('cancels when the sheet is dismissed without choosing', async () => {
    const outcome = openPayment();
    const { unmount } = await renderWithProviders(<SimulatedPaymentScreen />);
    await unmount();
    await expect(outcome).resolves.toEqual({ status: 'canceled' });
  });

  it('does not stay open outside demo mode', async () => {
    useSessionStore.setState({ isDemo: false });
    void openPayment();
    await renderWithProviders(<SimulatedPaymentScreen />);
    expect(routerMock.back).toHaveBeenCalled();
  });

  it('goes back when there is nothing to pay', async () => {
    await renderWithProviders(<SimulatedPaymentScreen />);
    expect(routerMock.back).toHaveBeenCalled();
  });
});
