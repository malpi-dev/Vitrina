import { useIsDemo } from '@/core/session';

export type SessionMode = 'demo' | 'guest';

/** Phase 08 adds 'live' when there is an authenticated session. */
export function useSessionMode(): SessionMode {
  return useIsDemo() ? 'demo' : 'guest';
}
