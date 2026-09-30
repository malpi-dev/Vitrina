import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useToastStore } from '@/core/ui';
import { useSessionStore } from '@/core/session';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';
import { MockStore } from '@/features/demo/data/mock-store';

import AddressScreen from '../screens/address-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);
jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

describe('AddressScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: true });
  });

  it('prefills the current address and saves changes, then goes back', async () => {
    const { store, queryClient } = await renderWithProviders(<AddressScreen />);
    expect(screen.getByTestId('address-skeleton')).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByTestId('address-line1').props.value).toBe('1600 Market Street'),
    );
    await fireEvent.changeText(screen.getByTestId('address-city'), 'Pittsburgh');
    await fireEvent.press(screen.getByTestId('save-address-button'));
    await waitFor(() => expect(routerMock.back).toHaveBeenCalled());
    expect(store.profile.defaultAddress?.city).toBe('Pittsburgh');
    expect(useToastStore.getState().message).toBe('Address saved');
    expect(queryClient.getQueryData(['profile'])).toMatchObject({
      defaultAddress: { city: 'Pittsburgh' },
    });
  });

  it('uses the profile name when there is no address yet', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    store.profile.defaultAddress = null;
    await renderWithProviders(<AddressScreen />, { store });
    await waitFor(() =>
      expect(screen.getByTestId('address-full-name').props.value).toBe('Demo Shopper'),
    );
    expect(screen.getByTestId('address-country').props.value).toBe('US');
  });
});
