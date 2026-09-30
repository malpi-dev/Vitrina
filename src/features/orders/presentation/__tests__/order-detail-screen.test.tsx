import { act, fireEvent, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { DEMO_PROFILE } from '@/features/demo/data/fixtures';
import { MockStore } from '@/features/demo/data/mock-store';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import OrderDetailScreen from '../screens/order-detail-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

const ID = (n: number) => `00000000-0000-4000-8000-000000000${n}`;
const MUG = ID(207);

function pendingOrder(store: MockStore) {
  return store.createOrder({
    items: [{ productId: MUG, quantity: 2 }],
    shippingAddress: DEMO_PROFILE.defaultAddress!,
  });
}

describe('OrderDetailScreen (demo)', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the frozen lines, address, totals and the timeline of a shipped order', async () => {
    routerMock.setSearchParams({ id: ID(302) });
    const store = new MockStore({ latencyMs: [0, 0] });
    await renderWithProviders(<OrderDetailScreen />, { store });
    expect(screen.getByTestId('order-skeleton')).toBeOnTheScreen();
    await screen.findByTestId('order-detail-screen');
    const order = store.orders.find((o) => o.id === ID(302))!;
    const item = order.items[0]!;
    expect(screen.getByTestId(`order-item-${item.productId}`)).toHaveTextContent(
      new RegExp(`${item.productName} × ${item.quantity}`),
    );
    expect(screen.getByTestId('order-subtotal')).toHaveTextContent(/^\$/);
    expect(screen.getByTestId('order-total')).toBeOnTheScreen();
    expect(screen.getByTestId('order-address')).toHaveTextContent(
      new RegExp(DEMO_PROFILE.defaultAddress!.line1),
    );
    expect(screen.getByTestId(`order-status-${ID(302)}`)).toHaveTextContent('Shipped');
    expect(screen.getByTestId('order-timeline')).toBeOnTheScreen();
    expect(screen.queryByTestId('live-paused-indicator')).not.toBeOnTheScreen();
  });

  it('shows "Free" shipping when it costs nothing and the amount otherwise', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    store.orders.find((o) => o.id === ID(302))!.shippingCents = 0;
    store.orders.find((o) => o.id === ID(301))!.shippingCents = 499;
    routerMock.setSearchParams({ id: ID(302) });
    const { unmount } = await renderWithProviders(<OrderDetailScreen />, { store });
    await screen.findByTestId('order-shipping');
    expect(screen.getByTestId('order-shipping')).toHaveTextContent('Free');
    await unmount();
    routerMock.setSearchParams({ id: ID(301) });
    await renderWithProviders(<OrderDetailScreen />, { store });
    await screen.findByTestId('order-shipping');
    expect(screen.getByTestId('order-shipping')).toHaveTextContent('$4.99');
  });

  it('shows the canceled note for an expired order', async () => {
    routerMock.setSearchParams({ id: ID(303) });
    await renderWithProviders(<OrderDetailScreen />);
    await screen.findByTestId('order-canceled-note');
    expect(screen.getByText('Expired — no charge was made')).toBeOnTheScreen();
    expect(screen.getByTestId('timeline-canceled')).toBeOnTheScreen();
  });

  it('shows "Order not found" with a way back', async () => {
    routerMock.setSearchParams({ id: ID(999) });
    await renderWithProviders(<OrderDetailScreen />);
    await screen.findByTestId('order-not-found');
    await fireEvent.press(screen.getByTestId('back-to-orders-button'));
    expect(routerMock.replace).toHaveBeenCalledWith('/orders');
  });

  it('shows an error with Retry that recovers', async () => {
    routerMock.setSearchParams({ id: ID(302) });
    const store = new MockStore({ latencyMs: [0, 0] });
    store.failNext({ code: 'network' });
    await renderWithProviders(<OrderDetailScreen />, { store });
    await screen.findByTestId('order-error');
    await fireEvent.press(screen.getByTestId('retry-button'));
    await screen.findByTestId('order-detail-screen');
  });

  it('goes from "Confirming payment…" to Paid to Shipped on its own (F7 CA1, CA4)', async () => {
    jest.useFakeTimers();
    const store = new MockStore({ latencyMs: [0, 0] });
    const order = pendingOrder(store);
    routerMock.setSearchParams({ id: order.id });
    await renderWithProviders(<OrderDetailScreen />, { store });
    await screen.findByTestId('confirming-payment');
    expect(screen.getByText('Confirming payment…')).toBeOnTheScreen();

    await act(async () => {
      store.startLifecycle(order.id);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByTestId('confirming-payment')).not.toBeOnTheScreen();
    expect(screen.getByTestId(`order-status-${order.id}`)).toHaveTextContent('Paid');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByTestId(`order-status-${order.id}`)).toHaveTextContent('Shipped');
    store.dispose();
  });

  it('shows the slow hint after 30 s of pending payment, and the payment error', async () => {
    jest.useFakeTimers();
    const store = new MockStore({ latencyMs: [0, 0] });
    const order = pendingOrder(store);
    routerMock.setSearchParams({ id: order.id });
    await renderWithProviders(<OrderDetailScreen />, { store });
    await screen.findByTestId('confirming-payment');
    expect(screen.queryByTestId('payment-slow-hint')).not.toBeOnTheScreen();
    await act(async () => {
      store.recordPaymentFailure(order.id, 'Your card was declined.');
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByTestId('payment-error')).toHaveTextContent('Your card was declined.');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.getByTestId('payment-slow-hint')).toHaveTextContent(
      'Taking longer than usual, pull to refresh',
    );
    store.dispose();
  });
});
