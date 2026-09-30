import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { toDomainError, type DomainError } from '@/core/errors';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: DomainError;
  }
}

const RETRYABLE: string[] = ['network', 'unknown'];

let unauthorizedHandler: (() => void) | null = null;

/**
 * Registered by the root layout. Kept as a callback so core/ does not import features.
 * Called once per failed query/mutation whose error is `unauthorized`.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

const onError = (error: unknown) => {
  if (toDomainError(error).code === 'unauthorized') unauthorizedHandler?.();
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          failureCount < 2 && RETRYABLE.includes(toDomainError(error).code),
      },
    },
  });
}

export const queryClient = createQueryClient();
