import { shippingAddressSchema } from '@/features/checkout/domain/shipping-address';

import type { Profile } from '../domain/profile';

export interface ProfileRow {
  id: string;
  full_name: string | null;
  default_address: unknown;
}

/** `default_address` is free-form jsonb: anything that is not a valid address becomes `null`. */
export function toProfile(row: ProfileRow): Profile {
  const address = shippingAddressSchema.safeParse(row.default_address);
  return {
    id: row.id,
    fullName: row.full_name,
    defaultAddress: address.success ? address.data : null,
  };
}
