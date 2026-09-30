import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { MockStore } from '@/features/demo/data/mock-store';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import OrdersScreen from '../screens/orders-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

const ID = (n: number) => `00000000-0000-4000-8000-000000000${n}`;

describe('OrdersScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: false });
  });

  describe('as a guest', () => {
    it('asks to sign in and returns to Orders afterwards (no redirect)', async () => {
      useAuthStore.setState({ status: 'signedOut', user: null });
      await renderWithProviders(<OrdersScreen />);
      expect(screen.getByText('Sign in to see your orders')).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('orders-sign-in-button'));
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: '/sign-in',
        params: { redirect: '/orders' },
      });
      expect(routerMock.replace).not.toHaveBeenCalled();
    });

    it('does not ask a signed-in user to sign in', async () => {
      useAuthStore.setState({ status: 'signedIn', user: { id: 'u', email: 'a@b.co' } });
      await renderWithProviders(<OrdersScreen />);
      expect(screen.queryByTestId('orders-sign-in-button')).not.toBeOnTheScreen();
    });
  });

  describe('in demo mode', () => {
    beforeEach(() => useSessionStore.setState({ isDemo: true }));

    it('shows a skeleton and then the 3 sample orders, newest first', async () => {
      await renderWithProviders(<OrdersScreen />);
      expect(screen.getByTestId('orders-skeleton')).toBeOnTheScreen();
      await screen.findByTestId(`order-row-${ID(302)}`);
      const rows = screen.getAllByTestId(/^order-row-/);
      expect(rows.map((r) => r.props.testID)).toEqual([
        `order-row-${ID(302)}`,
        `order-row-${ID(303)}`,
        `order-row-${ID(301)}`,
      ]);
      expect(screen.getByText('VT-DM37')).toBeOnTheScreen();
      expect(screen.getByTestId(`order-status-${ID(302)}`)).toHaveTextContent('Shipped');
      expect(screen.getByTestId(`order-status-${ID(303)}`)).toHaveTextContent('Canceled');
      expect(screen.getByTestId(`order-status-${ID(301)}`)).toHaveTextContent('Delivered');
    });

    it('opens the detail when a row is pressed', async () => {
      await renderWithProviders(<OrdersScreen />);
      await fireEvent.press(await screen.findByTestId(`order-row-${ID(302)}`));
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: '/orders/[id]',
        params: { id: ID(302) },
      });
    });

    it('shows the empty state and sends the user shopping', async () => {
      const store = new MockStore({ latencyMs: [0, 0] });
      store.orders = [];
      await renderWithProviders(<OrdersScreen />, { store });
      await screen.findByTestId('orders-empty');
      expect(screen.getByText('No orders yet')).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('start-shopping-button'));
      expect(routerMock.navigate).toHaveBeenCalledWith('/');
    });

    it('shows an error with Retry that recovers', async () => {
      const store = new MockStore({ latencyMs: [0, 0] });
      store.failNext({ code: 'network' });
      await renderWithProviders(<OrdersScreen />, { store });
      await screen.findByTestId('orders-error');
      await fireEvent.press(screen.getByTestId('retry-button'));
      await screen.findByTestId(`order-row-${ID(302)}`);
    });

    it('prepends a new order that arrives live, with no interaction', async () => {
      const store = new MockStore({ latencyMs: [0, 0] });
      await renderWithProviders(<OrdersScreen />, { store });
      await screen.findByTestId(`order-row-${ID(302)}`);
      let created: { id: string } | undefined;
      await act(async () => {
        created = store.createOrder({
          items: [{ productId: ID(207), quantity: 1 }],
          shippingAddress: store.profile.defaultAddress!,
        });
      });
      await waitFor(() => expect(screen.getByTestId(`order-row-${created!.id}`)).toBeOnTheScreen());
      expect(screen.getAllByTestId(/^order-row-/)[0]!.props.testID).toBe(
        `order-row-${created!.id}`,
      );
      store.dispose();
    });
  });
});
