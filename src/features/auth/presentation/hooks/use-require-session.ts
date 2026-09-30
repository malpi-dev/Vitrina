import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSessionMode } from './use-session-mode';

/**
 * Gate for screens that need a signed-in user (checkout). Guests are sent to Sign in and return to
 * `currentPath` afterwards. Returns whether the screen can render its content.
 */
export function useRequireSession(currentPath: string): boolean {
  const router = useRouter();
  const mode = useSessionMode();

  useEffect(() => {
    if (mode === 'guest') {
      router.replace({ pathname: '/sign-in', params: { redirect: currentPath } });
    }
  }, [mode, currentPath, router]);

  return mode === 'live' || mode === 'demo';
}
