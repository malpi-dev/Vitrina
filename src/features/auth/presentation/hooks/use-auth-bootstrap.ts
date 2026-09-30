import { useEffect } from 'react';

import { queryClient } from '@/core/query';

import type { AuthUser } from '../../domain/auth-user';
import type { AuthRepository } from '../../domain/auth.repository';
import { useAuthStore } from '../auth.store';

/**
 * Mirrors the persisted Supabase session into the auth store. Call once in the root layout.
 * `auth = null` means demo mode: there is nothing to read.
 */
export function useAuthBootstrap(auth: AuthRepository | null): void {
  useEffect(() => {
    if (!auth) return;
    let active = true;
    const apply = (user: AuthUser | null) => {
      if (!active) return;
      const wasSignedIn = useAuthStore.getState().status === 'signedIn';
      useAuthStore.getState().setUser(user);
      if (!user && wasSignedIn) queryClient.clear(); // never keep another user's data
    };

    const unsubscribe = auth.onAuthChange(apply);
    auth
      .getCurrentUser()
      .then(apply)
      .catch(() => apply(null));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);
}
