import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { useSessionStore } from '@/core/session';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import SignInScreen from '../screens/sign-in-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

describe('SignInScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ hasSeenWelcome: false, isDemo: false, demoSessionId: 0 });
  });

  it('shows the brand, the email form and both alternative entry points', async () => {
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByText('Vitrina')).toBeOnTheScreen();
    expect(screen.getByTestId('email-input')).toBeOnTheScreen();
    expect(screen.getByTestId('send-code-button')).toBeOnTheScreen();
    expect(
      screen.getByText('Try everything with sample data — no account, no real charges.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('explore-demo-button')).toBeOnTheScreen();
    expect(screen.getByTestId('continue-as-guest-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('close-sign-in')).not.toBeOnTheScreen();
  });

  it('shows a field error for an invalid email and does not send a code', async () => {
    const sendCode = jest.fn();
    await renderWithProviders(<SignInScreen />, {
      repositories: { auth: { sendCode } as never },
    });
    await fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    expect(await screen.findByText('Enter a valid email')).toBeOnTheScreen();
    expect(sendCode).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('sends the code with a normalized email and goes to /verify with email and redirect', async () => {
    routerMock.setSearchParams({ redirect: '/checkout' });
    const sendCode = jest.fn().mockResolvedValue(undefined);
    await renderWithProviders(<SignInScreen />, {
      repositories: { auth: { sendCode } as never },
    });
    await fireEvent.changeText(screen.getByTestId('email-input'), '  Shopper@Vitrina.dev ');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: '/verify',
        params: { email: 'shopper@vitrina.dev', redirect: '/checkout' },
      }),
    );
    expect(sendCode).toHaveBeenCalledWith('shopper@vitrina.dev');
  });

  it('shows a readable message when the server rejects (rate limit)', async () => {
    const sendCode = jest.fn().mockRejectedValue(new DomainError({ code: 'rateLimited' }));
    await renderWithProviders(<SignInScreen />, {
      repositories: { auth: { sendCode } as never },
    });
    await fireEvent.changeText(screen.getByTestId('email-input'), 'a@b.co');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    expect(await screen.findByText('Please wait a minute and try again.')).toBeOnTheScreen();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it('Explore demo enters demo mode and goes to the tabs', async () => {
    await renderWithProviders(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('explore-demo-button'));
    expect(useSessionStore.getState()).toMatchObject({
      isDemo: true,
      hasSeenWelcome: true,
      demoSessionId: 1,
    });
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });

  it('Continue as guest marks the welcome as seen without entering demo', async () => {
    await renderWithProviders(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('continue-as-guest-button'));
    expect(useSessionStore.getState()).toMatchObject({ isDemo: false, hasSeenWelcome: true });
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });

  it('coming from a gate hides "Continue as guest" and shows a close button', async () => {
    routerMock.setSearchParams({ redirect: '/orders' });
    await renderWithProviders(<SignInScreen />);
    expect(screen.queryByTestId('continue-as-guest-button')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('close-sign-in'));
    expect(routerMock.back).toHaveBeenCalled();
  });

  it('close falls back to Home when there is no history', async () => {
    routerMock.setSearchParams({ redirect: '/orders' });
    routerMock.canGoBack.mockReturnValue(false);
    await renderWithProviders(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('close-sign-in'));
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });

  it('ignores an unsafe redirect', async () => {
    routerMock.setSearchParams({ redirect: '//evil.com' });
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByTestId('continue-as-guest-button')).toBeOnTheScreen();
  });
});
