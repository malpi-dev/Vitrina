import { fireEvent, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import AccountScreen from '@/features/account/presentation/screens/account-screen';
import { renderWithProviders } from '@/test/render-with-providers';

import { DemoBanner } from '../components/demo-banner';

const mockReplace = jest.fn();
let mockForced = false;
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, navigate: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/core/config/env', () => ({
  env: {},
  get isDemoForced() {
    return mockForced;
  },
}));

describe('DemoBanner', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockForced = false;
    useSessionStore.setState({ hasSeenWelcome: true, isDemo: true, demoSessionId: 1 });
  });

  it('says it is demo mode and offers Exit demo', async () => {
    await renderWithProviders(<DemoBanner />);
    expect(screen.getByText('Demo mode — no real charges')).toBeOnTheScreen();
    expect(screen.getByTestId('exit-demo-button')).toBeOnTheScreen();
  });

  it('Exit demo leaves demo and goes back to Sign in', async () => {
    await renderWithProviders(<DemoBanner />);
    await fireEvent.press(screen.getByTestId('exit-demo-button'));
    expect(useSessionStore.getState().isDemo).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });

  it('hides Exit demo when demo is forced by the environment', async () => {
    mockForced = true;
    await renderWithProviders(<DemoBanner />);
    expect(screen.getByTestId('demo-banner')).toBeOnTheScreen();
    expect(screen.queryByTestId('exit-demo-button')).not.toBeOnTheScreen();
  });

  it('shows up in Account in demo mode only', async () => {
    const { unmount } = await renderWithProviders(<AccountScreen />);
    expect(screen.getByTestId('demo-banner')).toBeOnTheScreen();
    await unmount();
    useSessionStore.setState({ isDemo: false });
    await renderWithProviders(<AccountScreen />);
    expect(screen.queryByTestId('demo-banner')).not.toBeOnTheScreen();
  });
});
