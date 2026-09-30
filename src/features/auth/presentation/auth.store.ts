import { create } from 'zustand';

import type { AuthUser } from '../domain/auth-user';

interface AuthState {
  /** `unknown` until the persisted Supabase session has been read. Not persisted itself. */
  status: 'unknown' | 'signedIn' | 'signedOut';
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  setUser: (user) => set({ user, status: user ? 'signedIn' : 'signedOut' }),
}));
