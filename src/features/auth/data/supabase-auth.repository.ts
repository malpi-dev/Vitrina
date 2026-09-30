import type { Session, User } from '@supabase/supabase-js';

import { DomainError } from '@/core/errors';
import { run, type VitrinaSupabaseClient } from '@/core/supabase';

import type { AuthUser } from '../domain/auth-user';
import type { AuthRepository } from '../domain/auth.repository';

const toAuthUser = (user: User): AuthUser => ({ id: user.id, email: user.email ?? '' });
const fromSession = (session: Session | null): AuthUser | null =>
  session ? toAuthUser(session.user) : null;

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: VitrinaSupabaseClient) {}

  async sendCode(email: string): Promise<void> {
    await run(() => this.client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
  }

  async verifyCode(email: string, code: string): Promise<AuthUser> {
    const data = await run(() => this.client.auth.verifyOtp({ email, token: code, type: 'email' }));
    const user = fromSession(data.session);
    if (!user) throw new DomainError({ code: 'unknown' }, 'Verification returned no session');
    return user;
  }

  async signOut(): Promise<void> {
    await run(async () => ({ data: null, error: (await this.client.auth.signOut()).error }));
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const data = await run(() => this.client.auth.getSession());
    return fromSession(data.session);
  }

  onAuthChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) =>
      callback(fromSession(session)),
    );
    return () => data.subscription.unsubscribe();
  }
}
