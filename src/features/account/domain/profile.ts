import { z } from 'zod';

import type { ShippingAddress } from '@/features/checkout/domain/shipping-address';

export interface Profile {
  id: string;
  fullName: string | null;
  defaultAddress: ShippingAddress | null;
}

export const fullNameSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(100),
});
