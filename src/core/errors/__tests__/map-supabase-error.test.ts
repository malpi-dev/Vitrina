import { DomainError } from '../domain-error';
import { mapSupabaseError } from '../map-supabase-error';

const raise = (message: string, details?: string) => ({ code: 'P0001', message, details });

describe('mapSupabaseError', () => {
  it('returns an existing DomainError unchanged', () => {
    const original = new DomainError({ code: 'conflict' });
    expect(mapSupabaseError(original)).toBe(original);
  });

  it('maps outOfStock with parsed productIds', () => {
    const err = mapSupabaseError(raise('outOfStock', '["a","b"]'));
    expect(err.info).toEqual({ code: 'outOfStock', productIds: ['a', 'b'] });
  });

  it('maps productUnavailable with parsed productIds', () => {
    const err = mapSupabaseError(raise('productUnavailable', '["c"]'));
    expect(err.info).toEqual({ code: 'productUnavailable', productIds: ['c'] });
  });

  it('falls back to an empty productIds when details is not valid JSON', () => {
    expect(mapSupabaseError(raise('outOfStock', 'nope')).info).toEqual({
      code: 'outOfStock',
      productIds: [],
    });
    expect(mapSupabaseError(raise('outOfStock')).info).toEqual({
      code: 'outOfStock',
      productIds: [],
    });
  });

  it('maps P0001 validation', () => {
    expect(mapSupabaseError(raise('validation')).code).toBe('validation');
  });

  it('maps P0001 notFound with the given entity', () => {
    expect(mapSupabaseError(raise('notFound'), 'order').info).toEqual({
      code: 'notFound',
      entity: 'order',
    });
  });

  it('maps P0001 unauthorized', () => {
    expect(mapSupabaseError(raise('unauthorized')).code).toBe('unauthorized');
  });

  it('maps P0001 INVALID_TRANSITION to conflict', () => {
    expect(mapSupabaseError(raise('INVALID_TRANSITION')).code).toBe('conflict');
  });

  it('maps PGRST116 to notFound (default entity product)', () => {
    expect(mapSupabaseError({ code: 'PGRST116', message: 'x' }).info).toEqual({
      code: 'notFound',
      entity: 'product',
    });
    expect(mapSupabaseError({ code: 'PGRST116' }, 'profile').info).toEqual({
      code: 'notFound',
      entity: 'profile',
    });
  });

  it('maps PGRST301 to unauthorized', () => {
    expect(mapSupabaseError({ code: 'PGRST301' }).code).toBe('unauthorized');
  });

  it('maps HTTP 401 to unauthorized', () => {
    expect(mapSupabaseError({ status: 401, message: 'x' }).code).toBe('unauthorized');
  });

  it('maps AuthSessionMissingError to unauthorized', () => {
    expect(mapSupabaseError({ name: 'AuthSessionMissingError' }).code).toBe('unauthorized');
  });

  it('maps 42501 (RLS / execute denied) to unauthorized', () => {
    expect(mapSupabaseError({ code: '42501' }).code).toBe('unauthorized');
  });

  it.each(['23514', '22P02', '23502', '23505'])('maps %s to validation', (code) => {
    expect(mapSupabaseError({ code }).code).toBe('validation');
  });

  it('maps otp_expired to invalidCode with the expected message', () => {
    const err = mapSupabaseError({ code: 'otp_expired', message: 'Token has expired' });
    expect(err.code).toBe('invalidCode');
    expect(err.message).toBe('The code is invalid or has expired');
  });

  it('maps over_*rate_limit codes to rateLimited', () => {
    expect(mapSupabaseError({ code: 'over_email_send_rate_limit' }).code).toBe('rateLimited');
  });

  it('maps HTTP 429 to rateLimited', () => {
    expect(mapSupabaseError({ status: 429 }).code).toBe('rateLimited');
  });

  it.each(['Network request failed', 'Failed to fetch', 'fetch failed', 'Request timeout'])(
    'maps "%s" to network',
    (message) => {
      expect(mapSupabaseError(new TypeError(message)).code).toBe('network');
    },
  );

  it('maps anything else to unknown and keeps the cause', () => {
    const raw = { code: 'XX000', message: 'boom' };
    const err = mapSupabaseError(raw);
    expect(err.code).toBe('unknown');
    expect(err.cause).toBe(raw);
  });

  it('handles non-object inputs', () => {
    expect(mapSupabaseError('oops').code).toBe('unknown');
    expect(mapSupabaseError(null).code).toBe('unknown');
  });
});
