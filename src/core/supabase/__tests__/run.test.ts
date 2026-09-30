import { DomainError } from '@/core/errors';

import { run } from '../run';

describe('run', () => {
  it('returns data on success', async () => {
    const data = await run(() => Promise.resolve({ data: [{ id: 1 }], error: null }));
    expect(data).toEqual([{ id: 1 }]);
  });

  it('converts a returned error into a DomainError', async () => {
    const op = () => Promise.resolve({ data: null, error: { code: 'PGRST301', message: 'jwt' } });
    await expect(run(op)).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(run(op)).rejects.toBeInstanceOf(DomainError);
  });

  it('converts a thrown network error into network', async () => {
    const op = () => Promise.reject(new TypeError('Network request failed'));
    await expect(run(op)).rejects.toMatchObject({ code: 'network' });
  });

  it('passes the notFound entity through', async () => {
    const op = () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'none' } });
    const error = await run(op, 'order').catch((e: unknown) => e);
    expect(error).toMatchObject({ info: { code: 'notFound', entity: 'order' } });
  });
});
