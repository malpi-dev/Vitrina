import { act, renderHook } from '@testing-library/react-native';

import { queryClient } from '@/core/query';
import { useSessionStore } from '@/core/session';
import { showToast, useToastStore } from '@/core/ui';
import { DomainError } from '@/core/errors';

import type { AuthRepository } from '../../domain/auth.repository';
import { useAuthStore } from '../auth.store';
import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';
import { useSessionMode } from '../hooks/use-session-mode';
import { useUnauthorizedHandler } from '../hooks/use-unauthorized-handler';

jest.mock('@/core/config/env', () => ({ env: {}, isDemoForced: false }));

const user = { id: 'u1', email: 'a@b.co' };

function fakeAuth(initial: typeof user | null = user) {
  let listener: ((u: typeof user | null) => void) | null = null;
  const unsubscribe = jest.fn();
  const auth = {
    getCurrentUser: jest.fn().mockResolvedValue(initial),
    onAuthChange: jest.fn((cb: typeof listener) => {
      listener = cb;
      return unsubscribe;
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuthRepository;
  return { auth, unsubscribe, emit: (u: typeof user | null) => listener?.(u) };
}

beforeEach(() => {
  useAuthStore.setState({ status: 'unknown', user: null });
  useSessionStore.setState({ isDemo: false });
  queryClient.clear();
});

describe('useAuthBootstrap', () => {
  it('reads the persisted session and follows auth changes', async () => {
    const { auth, emit, unsubscribe } = fakeAuth(user);
    const { unmount } = await renderHook(() => useAuthBootstrap(auth));
    await act(async () => {});
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });

    queryClient.setQueryData(['x'], 1);
    await act(async () => emit(null));
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(queryClient.getQueryData(['x'])).toBeUndefined();

    await unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('becomes signed out when there is no session or the read fails', async () => {
    const { auth } = fakeAuth(null);
    await renderHook(() => useAuthBootstrap(auth));
    await act(async () => {});
    expect(useAuthStore.getState().status).toBe('signedOut');

    useAuthStore.setState({ status: 'unknown', user: null });
    (auth.getCurrentUser as jest.Mock).mockRejectedValue(new Error('boom'));
    await renderHook(() => useAuthBootstrap(auth));
    await act(async () => {});
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('does nothing in demo (null repository)', async () => {
    await renderHook(() => useAuthBootstrap(null));
    expect(useAuthStore.getState().status).toBe('unknown');
  });
});

describe('useSessionMode', () => {
  it('maps demo / unknown / guest / live', async () => {
    const { result } = await renderHook(() => useSessionMode());
    expect(result.current).toBe('unknown');
    await act(async () => useAuthStore.getState().setUser(null));
    expect(result.current).toBe('guest');
    await act(async () => useAuthStore.getState().setUser(user));
    expect(result.current).toBe('live');
    await act(async () => useSessionStore.setState({ isDemo: true }));
    expect(result.current).toBe('demo');
  });
});

describe('useUnauthorizedHandler', () => {
  it('toasts, signs out and clears the cache once for several failures', async () => {
    const { auth } = fakeAuth();
    useAuthStore.setState({ status: 'signedIn', user });
    queryClient.setQueryData(['x'], 1);
    await renderHook(() => useUnauthorizedHandler(auth));

    const fail = () =>
      queryClient.fetchQuery({
        queryKey: [Math.random()],
        queryFn: () => Promise.reject(new DomainError({ code: 'unauthorized' })),
        retry: false,
      });
    await act(async () => {
      await Promise.allSettled([fail(), fail(), fail()]);
    });

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState()).toMatchObject({
      message: 'Your session expired. Please sign in again.',
      tone: 'warning',
    });
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(queryClient.getQueryData(['x'])).toBeUndefined();
  });

  it('ignores unauthorized errors when nobody is signed in', async () => {
    const { auth } = fakeAuth();
    useAuthStore.setState({ status: 'signedOut', user: null });
    showToast('untouched');
    await renderHook(() => useUnauthorizedHandler(auth));
    await act(async () => {
      await queryClient
        .fetchQuery({
          queryKey: ['guest'],
          queryFn: () => Promise.reject(new DomainError({ code: 'unauthorized' })),
          retry: false,
        })
        .catch(() => {});
    });
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toBe('untouched');
  });
});
