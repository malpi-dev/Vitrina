import { createFakeSupabase } from '@/test/fake-supabase';

import { toProfile } from '../profile.mapper';
import { SupabaseProfileRepository } from '../supabase-profile.repository';

const address = {
  fullName: 'Sam Shopper',
  line1: '1 Main St',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'US',
};
const signedIn = { data: { session: { user: { id: 'u1' } } } };
const profileRow = { id: 'u1', full_name: 'Sam', default_address: address };

function setup() {
  const fake = createFakeSupabase();
  return { fake, repo: new SupabaseProfileRepository(fake.client) };
}

describe('toProfile', () => {
  it('maps snake_case and validates the address', () => {
    expect(toProfile(profileRow)).toEqual({ id: 'u1', fullName: 'Sam', defaultAddress: address });
  });

  it('turns an invalid or missing address into null', () => {
    expect(
      toProfile({ ...profileRow, default_address: { line1: 'only this' } }).defaultAddress,
    ).toBeNull();
    expect(toProfile({ ...profileRow, default_address: null }).defaultAddress).toBeNull();
  });
});

describe('SupabaseProfileRepository', () => {
  it('ensureMine calls the ensure_profile RPC', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: profileRow });
    await expect(repo.ensureMine()).resolves.toMatchObject({ id: 'u1', fullName: 'Sam' });
    expect(fake.calls).toContainEqual(['rpc', 'ensure_profile', undefined]);
  });

  it('getMine reads the profile of the session user', async () => {
    const { fake, repo } = setup();
    fake.respond(signedIn, { data: profileRow });
    await expect(repo.getMine()).resolves.toMatchObject({ id: 'u1', defaultAddress: address });
    expect(fake.calls).toContainEqual(['from', 'profiles']);
    expect(fake.calls).toContainEqual(['eq', 'id', 'u1']);
    expect(fake.calls.some((c) => c[0] === 'rpc')).toBe(false);
  });

  it('getMine calls ensure_profile when there is no row yet', async () => {
    const { fake, repo } = setup();
    fake.respond(signedIn, { data: null }, { data: { ...profileRow, full_name: null } });
    await expect(repo.getMine()).resolves.toMatchObject({ fullName: null });
    expect(fake.calls).toContainEqual(['rpc', 'ensure_profile', undefined]);
  });

  it('getMine without a session throws unauthorized', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { session: null } });
    await expect(repo.getMine()).rejects.toMatchObject({ info: { code: 'unauthorized' } });
  });

  it('update sends snake_case columns for the session user', async () => {
    const { fake, repo } = setup();
    fake.respond(signedIn, { data: profileRow });
    await repo.update({ fullName: 'Sam', defaultAddress: address });
    expect(fake.calls).toContainEqual(['update', { full_name: 'Sam', default_address: address }]);
    expect(fake.calls).toContainEqual(['eq', 'id', 'u1']);
  });

  it('update with only the name does not touch the address, and null clears it', async () => {
    const { fake, repo } = setup();
    fake.respond(signedIn, { data: profileRow });
    await repo.update({ fullName: 'Sam' });
    expect(fake.calls).toContainEqual(['update', { full_name: 'Sam' }]);
    fake.respond(signedIn, { data: profileRow });
    await repo.update({ defaultAddress: null });
    expect(fake.calls).toContainEqual(['update', { default_address: null }]);
  });

  it('maps server errors to DomainError', async () => {
    const { fake, repo } = setup();
    fake.respond(signedIn, { error: { code: '42501', message: 'denied' } });
    await expect(repo.update({ fullName: 'x' })).rejects.toMatchObject({
      info: { code: 'unauthorized' },
    });
  });
});
