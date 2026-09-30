import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { useThemeStore } from '@/core/theme';
import { useToastStore } from '@/core/ui';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { useCartStore } from '@/features/cart/presentation/cart.store';
import { useSessionStore } from '@/core/session';
import { MockStore } from '@/features/demo/data/mock-store';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import AccountScreen from '../screens/account-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '9.9.9' } }));

const user = { id: 'u1', email: 'shopper@vitrina.dev' };

function live() {
  useSessionStore.setState({ isDemo: false });
  useAuthStore.setState({ status: 'signedIn', user });
}

describe('AccountScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useCartStore.setState({ items: [] });
    useThemeStore.setState({ preference: 'system' });
    useSessionStore.setState({ isDemo: false });
    useAuthStore.setState({ status: 'signedOut', user: null });
  });

  it('guest: invites to sign in and comes back to Account', async () => {
    await renderWithProviders(<AccountScreen />);
    expect(screen.getByText("You're browsing as a guest")).toBeOnTheScreen();
    expect(screen.queryByTestId('save-name-button')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('sign-out-button')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('account-sign-in-button'));
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/sign-in',
      params: { redirect: '/account' },
    });
    expect(screen.getByTestId('app-version')).toHaveTextContent('Version 9.9.9');
  });

  it('demo: shows the demo user, the banner and no Sign out', async () => {
    useSessionStore.setState({ isDemo: true });
    await renderWithProviders(<AccountScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('account-header')).toHaveTextContent(/Demo Shopper/),
    );
    expect(screen.getByText('demo@vitrina.app')).toBeOnTheScreen();
    expect(screen.getByTestId('demo-banner')).toBeOnTheScreen();
    expect(screen.getByTestId('exit-demo-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('sign-out-button')).not.toBeOnTheScreen();
  });

  it('live: shows a skeleton, then the name, email and address summary', async () => {
    live();
    await renderWithProviders(<AccountScreen />);
    expect(screen.getByTestId('account-skeleton')).toBeOnTheScreen();
    expect(await screen.findByTestId('address-summary')).toBeOnTheScreen();
    expect(screen.getByText('shopper@vitrina.dev')).toBeOnTheScreen();
    expect(screen.getByTestId('sign-out-button')).toBeOnTheScreen();
  });

  it('live without a name or address asks for them', async () => {
    live();
    const store = new MockStore({ latencyMs: [0, 0] });
    store.profile.fullName = null;
    store.profile.defaultAddress = null;
    await renderWithProviders(<AccountScreen />, { store });
    expect(await screen.findByText('Add your name')).toBeOnTheScreen();
    expect(screen.getByText('Add a default address')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('edit-address-button'));
    expect(routerMock.push).toHaveBeenCalledWith('/account/address');
  });

  it('saves the name, updates the cache and shows a toast', async () => {
    live();
    const { store } = await renderWithProviders(<AccountScreen />);
    await screen.findByTestId('name-input');
    await fireEvent.changeText(screen.getByTestId('name-input'), '  Sam Shopper ');
    await fireEvent.press(screen.getByTestId('save-name-button'));
    await waitFor(() => expect(store.profile.fullName).toBe('Sam Shopper'));
    await waitFor(() => expect(useToastStore.getState().message).toBe('Saved'));
    await waitFor(() =>
      expect(screen.getByTestId('account-header')).toHaveTextContent(/Sam Shopper/),
    );
  });

  it('rejects an empty name', async () => {
    live();
    await renderWithProviders(<AccountScreen />);
    await screen.findByTestId('name-input');
    await fireEvent.changeText(screen.getByTestId('name-input'), '   ');
    await fireEvent.press(screen.getByTestId('save-name-button'));
    expect(await screen.findByText('Required')).toBeOnTheScreen();
  });

  it('theme selector updates and persists the preference', async () => {
    await renderWithProviders(<AccountScreen />);
    await fireEvent.press(screen.getByTestId('theme-dark'));
    expect(useThemeStore.getState().preference).toBe('dark');
    expect(screen.getByTestId('theme-dark')).toBeSelected();
    await fireEvent.press(screen.getByTestId('theme-light'));
    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('sign out returns to guest, clears the query cache and keeps the cart', async () => {
    live();
    useCartStore.setState({
      items: [
        {
          productId: 'p1',
          quantity: 2,
          snapshot: { name: 'Mug', priceCents: 1500, imageUrl: null },
          addedAt: '2026-09-30T00:00:00.000Z',
        },
      ],
    });
    const signOut = jest.fn().mockResolvedValue(undefined);
    const { queryClient } = await renderWithProviders(<AccountScreen />, {
      repositories: { auth: { signOut } as never },
    });
    await screen.findByTestId('sign-out-button');
    queryClient.setQueryData(['orders'], [1]);
    await fireEvent.press(screen.getByTestId('sign-out-button'));
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
    expect(signOut).toHaveBeenCalled();
    expect(queryClient.getQueryData(['orders'])).toBeUndefined();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useToastStore.getState().message).toBe('Signed out');
    expect(await screen.findByText("You're browsing as a guest")).toBeOnTheScreen();
  });

  it('live with a failing profile shows the error with Retry and still allows Sign out', async () => {
    live();
    const getMine = jest.fn().mockRejectedValue(new DomainError({ code: 'network' }));
    await renderWithProviders(<AccountScreen />, {
      repositories: { profile: { getMine, update: jest.fn(), ensureMine: jest.fn() } },
    });
    expect(await screen.findByText("You're offline")).toBeOnTheScreen();
    expect(screen.getByTestId('sign-out-button')).toBeOnTheScreen();
    getMine.mockResolvedValue({ id: 'u1', fullName: 'Sam', defaultAddress: null });
    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(await screen.findByTestId('name-input')).toBeOnTheScreen();
  });
});
