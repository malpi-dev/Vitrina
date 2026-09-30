import { createContext, useContext, type ReactNode } from 'react';

import type { VitrinaSupabaseClient } from '@/core/supabase';
import { SupabaseProfileRepository } from '@/features/account/data/supabase-profile.repository';
import { MockProfileRepository } from '@/features/account/data/mock-profile.repository';
import type { ProfileRepository } from '@/features/account/domain/profile.repository';
import { SupabaseAuthRepository } from '@/features/auth/data/supabase-auth.repository';
import { MockAuthRepository } from '@/features/auth/data/mock-auth.repository';
import type { AuthRepository } from '@/features/auth/domain/auth.repository';
import { SupabaseProductsRepository } from '@/features/catalog/data/supabase-products.repository';
import { MockProductsRepository } from '@/features/catalog/data/mock-products.repository';
import type { ProductsRepository } from '@/features/catalog/domain/products.repository';
import { MockCheckoutRepository } from '@/features/checkout/data/mock-checkout.repository';
import type { CheckoutRepository } from '@/features/checkout/domain/checkout.repository';
import type { MockStore } from '@/features/demo/data/mock-store';
import { SupabaseOrdersRepository } from '@/features/orders/data/supabase-orders.repository';
import { MockOrdersRepository } from '@/features/orders/data/mock-orders.repository';
import type { OrdersRepository } from '@/features/orders/domain/orders.repository';

import { unavailableCheckout } from './unavailable-repositories';

// Composition root: the only place in core/ that imports from features/*/data.
export interface Repositories {
  products: ProductsRepository;
  checkout: CheckoutRepository;
  orders: OrdersRepository;
  auth: AuthRepository;
  profile: ProfileRepository;
}

export function createMockRepositories(store: MockStore): Repositories {
  return {
    products: new MockProductsRepository(store),
    checkout: new MockCheckoutRepository(store),
    orders: new MockOrdersRepository(store),
    auth: new MockAuthRepository(store),
    profile: new MockProfileRepository(store),
  };
}

/** Supabase implementations arrive phase by phase; the rest are "Not available yet" stubs. */
export function createLiveRepositories(client: VitrinaSupabaseClient): Repositories {
  return {
    products: new SupabaseProductsRepository(client),
    checkout: unavailableCheckout,
    orders: new SupabaseOrdersRepository(client),
    auth: new SupabaseAuthRepository(client),
    profile: new SupabaseProfileRepository(client),
  };
}

const RepositoryContext = createContext<Repositories | null>(null);

export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoryContext);
  if (!repositories) throw new Error('useRepositories must be used inside a RepositoryProvider');
  return repositories;
}
