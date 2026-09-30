import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SupabaseProductsRepository } from '@/features/catalog/data/supabase-products.repository';
import { MockStore } from '@/features/demo/data/mock-store';
import { renderWithProviders } from '@/test/render-with-providers';
import { Text } from 'react-native';
import { useEffect } from 'react';

import type { VitrinaSupabaseClient } from '@/core/supabase';

import {
  createLiveRepositories,
  createMockRepositories,
  RepositoryProvider,
  useRepositories,
} from '../repositories';

describe('repositories', () => {
  it('createMockRepositories builds the 5 repositories on top of one store', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    const repos = createMockRepositories(store);
    expect(Object.keys(repos).sort()).toEqual([
      'auth',
      'checkout',
      'orders',
      'products',
      'profile',
    ]);
    const page = await repos.products.list({ sort: 'newest' });
    expect(page.items).toHaveLength(20);
    await expect(repos.profile.getMine()).resolves.toMatchObject({ fullName: 'Demo Shopper' });
  });

  it('createLiveRepositories wires Supabase products and "Not available yet" stubs for the rest', async () => {
    const repos = createLiveRepositories({} as VitrinaSupabaseClient);
    expect(repos.products).toBeInstanceOf(SupabaseProductsRepository);
    await expect(repos.profile.getMine()).rejects.toMatchObject({
      info: { code: 'unknown' },
      message: 'Not available yet',
    });
    await expect(repos.checkout.startCheckout({} as never)).rejects.toThrow('Not available yet');
    expect(() => repos.orders.subscribe({}, jest.fn())).toThrow('Not available yet');
  });

  it('useRepositories throws outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useRepositories())).rejects.toThrow(/RepositoryProvider/);
    spy.mockRestore();
  });

  it('useRepositories returns the provided repositories', async () => {
    const repositories = createMockRepositories(new MockStore({ latencyMs: [0, 0] }));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider repositories={repositories}>{children}</RepositoryProvider>
    );
    const { result } = await renderHook(() => useRepositories(), { wrapper });
    expect(result.current).toBe(repositories);
  });

  it('renderWithProviders injects mock repositories and lets tests override them', async () => {
    const seen: unknown[] = [];
    function Probe() {
      const repos = useRepositories();
      useEffect(() => {
        seen.push(repos);
      });
      return <Text>probe</Text>;
    }
    const products = { list: jest.fn() } as never;
    await renderWithProviders(<Probe />, { repositories: { products } });
    const repos = seen[0] as ReturnType<typeof createMockRepositories>;
    expect(repos.products).toBe(products);
    expect(repos.orders).toBeDefined();
  });
});
