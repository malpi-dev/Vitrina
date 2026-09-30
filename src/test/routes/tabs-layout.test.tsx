import { screen } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { renderWithProviders } from '@/test/render-with-providers';

import TabsLayout from '@/app/(tabs)/_layout';

let mockForced = false;
jest.mock('@/core/config/env', () => ({
  env: {},
  get isDemoForced() {
    return mockForced;
  },
}));
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot reference imports
  const { Text } = require('react-native');
  function Tabs({ children }: { children: unknown }) {
    return <>{children}</>;
  }
  Tabs.Screen = function TabsScreen({
    name,
    options,
  }: {
    name: string;
    options: { tabBarButtonTestID: string };
  }) {
    return <Text testID={options.tabBarButtonTestID}>{name}</Text>;
  };
  function Redirect({ href }: { href: string }) {
    return <Text testID="redirect">{href}</Text>;
  }
  return { Tabs, Redirect };
});

describe('TabsLayout', () => {
  beforeEach(() => {
    mockForced = false;
    useSessionStore.setState({ hasSeenWelcome: false, isDemo: false });
  });

  it('redirects to Sign in until the welcome has been seen', async () => {
    await renderWithProviders(<TabsLayout />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/sign-in');
  });

  it('shows the four tabs with their testIDs once the welcome has been seen', async () => {
    useSessionStore.setState({ hasSeenWelcome: true });
    await renderWithProviders(<TabsLayout />);
    for (const id of ['tab-home', 'tab-cart', 'tab-orders', 'tab-account']) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
  });

  it('never redirects when demo is forced', async () => {
    mockForced = true;
    await renderWithProviders(<TabsLayout />);
    expect(screen.queryByTestId('redirect')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tab-home')).toBeOnTheScreen();
  });
});
