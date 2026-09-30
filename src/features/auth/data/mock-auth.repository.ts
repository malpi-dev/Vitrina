import { DomainError } from '@/core/errors';
import type { MockStore } from '@/features/demo/data/mock-store';

import type { AuthUser } from '../domain/auth-user';
import type { AuthRepository } from '../domain/auth.repository';

/** The demo never shows auth screens; this keeps the repository set complete and serves tests. */
export class MockAuthRepository implements AuthRepository {
  constructor(private readonly store: MockStore) {}

  async sendCode(): Promise<void> {
    await this.store.delay();
    this.store.takeFailure();
  }

  async verifyCode(_email: string, code: string): Promise<AuthUser> {
    await this.store.delay();
    this.store.takeFailure();
    if (code !== '123456') {
      throw new DomainError({ code: 'invalidCode' }, 'The code is invalid or has expired');
    }
    return { ...this.store.user };
  }

  async signOut(): Promise<void> {}

  async getCurrentUser(): Promise<AuthUser | null> {
    return { ...this.store.user };
  }

  onAuthChange(callback: (user: AuthUser | null) => void): () => void {
    callback({ ...this.store.user });
    return () => {};
  }
}
