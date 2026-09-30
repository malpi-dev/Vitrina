import type { AuthUser } from './auth-user';

export interface AuthRepository {
  sendCode(email: string): Promise<void>;
  /** Throws `invalidCode` / `rateLimited`. */
  verifyCode(email: string, code: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthChange(callback: (user: AuthUser | null) => void): () => void;
}
