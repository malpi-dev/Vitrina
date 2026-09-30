import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isDemoForced } from '@/core/config/env';
import { queryClient } from '@/core/query';

interface SessionState {
  hasSeenWelcome: boolean;
  isDemo: boolean;
  /** Not persisted. Bumping it gives the app a fresh MockStore. */
  demoSessionId: number;
  markWelcomeSeen: () => void;
  enterDemo: () => void;
  exitDemo: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      isDemo: false,
      demoSessionId: 0,

      markWelcomeSeen: () => set({ hasSeenWelcome: true }),

      enterDemo: () => {
        queryClient.clear(); // never mix caches between data sources
        set((s) => ({ isDemo: true, hasSeenWelcome: true, demoSessionId: s.demoSessionId + 1 }));
      },

      exitDemo: () => {
        if (isDemoForced) return;
        queryClient.clear();
        set({ isDemo: false });
      },
    }),
    {
      name: 'vitrina-session',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasSeenWelcome: s.hasSeenWelcome, isDemo: s.isDemo }),
    },
  ),
);

/** Demo is on when forced by the environment (no backend configured) or chosen by the user. */
export const useIsDemo = (): boolean => useSessionStore((s) => isDemoForced || s.isDemo);

/** True once the persisted session has been read from storage (avoids flashing Sign in on launch). */
export function useSessionHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useSessionStore.persist.onFinishHydration(onChange),
    () => useSessionStore.persist.hasHydrated(),
    () => false,
  );
}
