import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';
import { queryKeys } from '@/core/query';
import { useSessionStore } from '@/core/session';
import type { Profile } from '@/features/account/domain/profile';
import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import { useAuthStore } from '../auth.store';
import VerifyScreen from '../screens/verify-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

const user = { id: 'u1', email: 'shopper@vitrina.dev' };
const profile: Profile = { id: 'u1', fullName: null, defaultAddress: null };

function repos(overrides: {
  verifyCode?: jest.Mock;
  ensureMine?: jest.Mock;
  sendCode?: jest.Mock;
}) {
  return {
    auth: {
      verifyCode: overrides.verifyCode ?? jest.fn().mockResolvedValue(user),
      sendCode: overrides.sendCode ?? jest.fn().mockResolvedValue(undefined),
    } as never,
    profile: { ensureMine: overrides.ensureMine ?? jest.fn().mockResolvedValue(profile) } as never,
  };
}

describe('VerifyScreen', () => {
  beforeEach(() => {
    routerMock.reset();
    routerMock.setSearchParams({ email: 'shopper@vitrina.dev', redirect: '/checkout' });
    useAuthStore.setState({ status: 'signedOut', user: null });
    useSessionStore.setState({ hasSeenWelcome: false, isDemo: false });
  });

  it('shows the email it sent the code to and lets the user change it', async () => {
    await renderWithProviders(<VerifyScreen />, { repositories: repos({}) });
    expect(screen.getByText('We sent a 6-digit code to shopper@vitrina.dev')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('change-email-button'));
    expect(routerMock.back).toHaveBeenCalled();
  });

  it('verifies, ensures the profile, caches it and replaces to the redirect', async () => {
    const verifyCode = jest.fn().mockResolvedValue(user);
    const ensureMine = jest.fn().mockResolvedValue(profile);
    const { queryClient } = await renderWithProviders(<VerifyScreen />, {
      repositories: repos({ verifyCode, ensureMine }),
    });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456'); // auto-submits
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/checkout'));
    expect(verifyCode).toHaveBeenCalledWith('shopper@vitrina.dev', '123456');
    expect(ensureMine).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(queryKeys.profile)).toEqual(profile);
    expect(useSessionStore.getState().hasSeenWelcome).toBe(true);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });
  });

  it('goes to Home when the redirect is unsafe or missing', async () => {
    routerMock.setSearchParams({ email: 'a@b.co', redirect: '//evil.com' });
    await renderWithProviders(<VerifyScreen />, { repositories: repos({}) });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/'));
  });

  it('a wrong code shows an inline message and clears the input', async () => {
    const verifyCode = jest.fn().mockRejectedValue(new DomainError({ code: 'invalidCode' }));
    const ensureMine = jest.fn();
    await renderWithProviders(<VerifyScreen />, {
      repositories: repos({ verifyCode, ensureMine }),
    });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    expect(await screen.findByText('The code is invalid or has expired.')).toBeOnTheScreen();
    expect(screen.getByTestId('otp-input').props.value).toBe('');
    expect(ensureMine).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('still signs in when ensure_profile fails (getMine self-heals later)', async () => {
    const ensureMine = jest.fn().mockRejectedValue(new DomainError({ code: 'network' }));
    const { queryClient } = await renderWithProviders(<VerifyScreen />, {
      repositories: repos({ ensureMine }),
    });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(queryClient.getQueryData(queryKeys.profile)).toBeUndefined();
  });

  it('the Verify button is disabled until 6 digits are typed and strips non-digits', async () => {
    await renderWithProviders(<VerifyScreen />, { repositories: repos({}) });
    await fireEvent.changeText(screen.getByTestId('otp-input'), '12a3');
    expect(screen.getByTestId('otp-input').props.value).toBe('123');
    expect(screen.getByTestId('verify-button')).toBeDisabled();
  });

  describe('resend', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('counts down 60 s and then resends the code', async () => {
      const sendCode = jest.fn().mockResolvedValue(undefined);
      await renderWithProviders(<VerifyScreen />, { repositories: repos({ sendCode }) });
      expect(screen.getByText('Resend code in 60s')).toBeOnTheScreen();
      expect(screen.getByTestId('resend-code-button')).toBeDisabled();

      for (let i = 0; i < 60; i++) {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(1000);
        });
      }
      expect(screen.getByText('Resend code')).toBeOnTheScreen();

      await fireEvent.press(screen.getByTestId('resend-code-button'));
      await waitFor(() => expect(sendCode).toHaveBeenCalledWith('shopper@vitrina.dev'));
      expect(await screen.findByText('Resend code in 60s')).toBeOnTheScreen();
    });
  });
});
