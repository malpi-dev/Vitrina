import { useIsDemo } from '@/core/session';

import { useAuthStore } from '../auth.store';

export type SessionMode = 'demo' | 'live' | 'guest' | 'unknown';

/** `unknown` only while the persisted Supabase session is being read at launch. */
export function useSessionMode(): SessionMode {
  const isDemo = useIsDemo();
  const status = useAuthStore((s) => s.status);
  if (isDemo) return 'demo';
  if (status === 'signedIn') return 'live';
  return status === 'signedOut' ? 'guest' : 'unknown';
}
