import type { ShippingAddress } from '@/features/checkout/domain/shipping-address';

import type { Profile } from './profile';

export interface ProfileRepository {
  /** Calls `vitrina.ensure_profile()`; idempotent. */
  ensureMine(): Promise<Profile>;
  /** Throws `unauthorized` if signed out. */
  getMine(): Promise<Profile>;
  update(patch: { fullName?: string; defaultAddress?: ShippingAddress | null }): Promise<Profile>;
}
