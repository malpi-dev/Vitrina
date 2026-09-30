import { fireEvent, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import OrdersScreen from '../screens/orders-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

describe('OrdersScreen (provisional until phase 09)', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: false });
  });

  it('asks a guest to sign in and returns to Orders afterwards (no redirect)', async () => {
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
