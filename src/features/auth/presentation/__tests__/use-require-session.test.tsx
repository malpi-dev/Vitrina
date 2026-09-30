import { renderHook } from '@testing-library/react-native';

import { useSessionStore } from '@/core/session';
import { routerMock } from '@/test/expo-router-mock';

import { useAuthStore } from '../auth.store';
import { useRequireSession } from '../hooks/use-require-session';

jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

describe('useRequireSession', () => {
  beforeEach(() => {
    routerMock.reset();
    useSessionStore.setState({ isDemo: false });
    useAuthStore.setState({ status: 'signedOut', user: null });
  });

  it('redirects a guest to Sign in keeping the current path', async () => {
    const { result } = await renderHook(() => useRequireSession('/checkout'));
    expect(result.current).toBe(false);
    expect(routerMock.replace).toHaveBeenCalledWith({
      pathname: '/sign-in',
      params: { redirect: '/checkout' },
    });
  });

  it('lets a signed-in user through without redirecting', async () => {
    useAuthStore.setState({ status: 'signedIn', user: { id: 'u', email: 'a@b.co' } });
    const { result } = await renderHook(() => useRequireSession('/checkout'));
    expect(result.current).toBe(true);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('lets demo through without redirecting', async () => {
    useSessionStore.setState({ isDemo: true });
    const { result } = await renderHook(() => useRequireSession('/checkout'));
    expect(result.current).toBe(true);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('waits without redirecting while the session is unknown', async () => {
    useAuthStore.setState({ status: 'unknown', user: null });
    const { result } = await renderHook(() => useRequireSession('/checkout'));
    expect(result.current).toBe(false);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
