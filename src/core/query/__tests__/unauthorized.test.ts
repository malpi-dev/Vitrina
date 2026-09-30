import { QueryClient } from '@tanstack/react-query';

import { DomainError } from '@/core/errors';

import { createQueryClient, setUnauthorizedHandler } from '../query-client';

describe('query client', () => {
  let client: QueryClient;
  beforeEach(() => {
    client = createQueryClient();
  });
  afterEach(() => {
    client.clear(); // drops gc timers so the Jest worker can exit
    setUnauthorizedHandler(null);
  });

  it('calls the unauthorized handler once for an unauthorized query', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    await client
      .fetchQuery({
        queryKey: ['x'],
        queryFn: () => Promise.reject(new DomainError({ code: 'unauthorized' })),
      })
      .catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call the handler for other errors', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    await client
      .fetchQuery({
        queryKey: ['y'],
        retry: false,
        queryFn: () => Promise.reject(new DomainError({ code: 'conflict' })),
      })
      .catch(() => undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it('retries only network and unknown errors, at most twice', () => {
    const retry = client.getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;
    const network = new DomainError({ code: 'network' });
    expect(retry(0, network)).toBe(true);
    expect(retry(1, network)).toBe(true);
    expect(retry(2, network)).toBe(false);
    expect(retry(0, new Error('raw'))).toBe(true);
    expect(retry(0, new DomainError({ code: 'notFound', entity: 'product' }))).toBe(false);
    expect(client.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });
});
