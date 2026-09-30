import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createMockRepositories, RepositoryProvider, type Repositories } from '@/core/di';
import { MockStore } from '@/features/demo/data/mock-store';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

interface ProviderOptions {
  queryClient?: QueryClient;
  /** Overrides on top of the mock repositories (zero latency). */
  repositories?: Partial<Repositories>;
  store?: MockStore;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

/** Renders with a fresh QueryClient, SafeAreaProvider and mock repositories (optionally overridden). */
export async function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    store = new MockStore({ latencyMs: [0, 0] }),
    repositories,
    ...options
  }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const allRepositories: Repositories = { ...createMockRepositories(store), ...repositories };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repositories={allRepositories}>{children}</RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
  const result = await render(ui, { wrapper: Wrapper, ...options });
  return { ...result, queryClient, store };
}
