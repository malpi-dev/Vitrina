import { fireEvent, screen } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { renderWithProviders } from '@/test/render-with-providers';

import SignInScreen from '../screens/sign-in-screen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, navigate: jest.fn(), push: jest.fn() }),
}));

describe('SignInScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    useSessionStore.setState({ hasSeenWelcome: false, isDemo: false, demoSessionId: 0 });
  });

  it('shows the brand, the demo help text and both entry points', async () => {
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByText('Vitrina')).toBeOnTheScreen();
    expect(
      screen.getByText('Try everything with sample data — no account, no real charges.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('explore-demo-button')).toBeOnTheScreen();
    expect(screen.getByTestId('continue-as-guest-button')).toBeOnTheScreen();
  });

  it('Explore demo enters demo mode and goes to the tabs', async () => {
    await renderWithProviders(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('explore-demo-button'));
    expect(useSessionStore.getState()).toMatchObject({
      isDemo: true,
      hasSeenWelcome: true,
      demoSessionId: 1,
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('Continue as guest marks the welcome as seen without entering demo', async () => {
    await renderWithProviders(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('continue-as-guest-button'));
    expect(useSessionStore.getState()).toMatchObject({ isDemo: false, hasSeenWelcome: true });
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
