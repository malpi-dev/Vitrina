import { DomainError } from '@/core/errors';
import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseAuthRepository } from '../supabase-auth.repository';

const session = { user: { id: 'u1', email: 'shopper@vitrina.dev' } };

function setup() {
  const fake = createFakeSupabase();
  return { fake, repo: new SupabaseAuthRepository(fake.client) };
}

describe('SupabaseAuthRepository', () => {
  it('sendCode requests an OTP and allows creating users', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: {} });
    await repo.sendCode('shopper@vitrina.dev');
    expect(fake.calls).toContainEqual([
      'auth.signInWithOtp',
      { email: 'shopper@vitrina.dev', options: { shouldCreateUser: true } },
    ]);
  });

  it('verifyCode verifies an email OTP and returns the user', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { session, user: session.user } });
    await expect(repo.verifyCode('shopper@vitrina.dev', '123456')).resolves.toEqual({
      id: 'u1',
      email: 'shopper@vitrina.dev',
    });
    expect(fake.calls).toContainEqual([
      'auth.verifyOtp',
      { email: 'shopper@vitrina.dev', token: '123456', type: 'email' },
    ]);
  });

  it('verifyCode maps otp_expired to invalidCode', async () => {
    const { fake, repo } = setup();
    fake.respond({ error: { code: 'otp_expired', message: 'Token has expired or is invalid' } });
    await expect(repo.verifyCode('a@b.co', '000000')).rejects.toMatchObject({
      info: { code: 'invalidCode' },
      message: 'The code is invalid or has expired',
    });
  });

  it('verifyCode fails with unknown when there is no session', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { session: null, user: null } });
    await expect(repo.verifyCode('a@b.co', '123456')).rejects.toMatchObject({
      info: { code: 'unknown' },
    });
  });

  it('sendCode maps the email rate limit to rateLimited', async () => {
    const { fake, repo } = setup();
    fake.respond({ error: { code: 'over_email_send_rate_limit', message: 'rate limit' } });
    await expect(repo.sendCode('a@b.co')).rejects.toMatchObject({ info: { code: 'rateLimited' } });
  });

  it('sendCode maps a network failure to network', async () => {
    const { fake, repo } = setup();
    fake.respond(new TypeError('Network request failed'));
    const error = await repo.sendCode('a@b.co').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ info: { code: 'network' } });
  });

  it('signOut calls auth.signOut and surfaces errors as DomainError', async () => {
    const { fake, repo } = setup();
    fake.respond({ error: null });
    await repo.signOut();
    expect(fake.calls).toContainEqual(['auth.signOut']);
    fake.respond({ error: { message: 'boom', status: 500 } });
    await expect(repo.signOut()).rejects.toBeInstanceOf(DomainError);
  });

  it('getCurrentUser returns the session user or null', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { session } });
    await expect(repo.getCurrentUser()).resolves.toEqual({
      id: 'u1',
      email: 'shopper@vitrina.dev',
    });
    fake.respond({ data: { session: null } });
    await expect(repo.getCurrentUser()).resolves.toBeNull();
  });

  it('onAuthChange forwards session changes and unsubscribes', () => {
    const { fake, repo } = setup();
    const listener = jest.fn();
    const unsubscribe = repo.onAuthChange(listener);
    fake.emitAuthChange('SIGNED_IN', session);
    fake.emitAuthChange('SIGNED_OUT', null);
    expect(listener).toHaveBeenNthCalledWith(1, { id: 'u1', email: 'shopper@vitrina.dev' });
    expect(listener).toHaveBeenNthCalledWith(2, null);
    unsubscribe();
    expect(fake.activeAuthListeners()).toBe(0);
  });
});
