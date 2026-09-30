import { useEffect } from 'react';

import { queryClient, setUnauthorizedHandler } from '@/core/query';
import { showToast } from '@/core/ui';

import type { AuthRepository } from '../../domain/auth.repository';
import { useAuthStore } from '../auth.store';

/**
 * Registers the global `unauthorized` handler: toast, sign out, clear the cache.
 * Runs once per expired session even when several queries fail together.
 */
export function useUnauthorizedHandler(auth: AuthRepository): void {
  useEffect(() => {
    let handling = false;
    setUnauthorizedHandler(() => {
      if (handling || useAuthStore.getState().status !== 'signedIn') return;
      handling = true;
      showToast('Your session expired. Please sign in again.', 'warning');
      auth
        .signOut()
        .catch(() => {})
        .finally(() => {
          useAuthStore.getState().setUser(null);
          queryClient.clear();
          handling = false;
        });
    });
    return () => setUnauthorizedHandler(null);
  }, [auth]);
}
