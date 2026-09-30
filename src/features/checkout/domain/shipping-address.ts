import { z } from 'zod';

/** Optional text field: a blank string counts as "not provided". */
const optionalText = (max: number, pattern?: { re: RegExp; message: string }) =>
  z
    .string()
    .trim()
    .refine((v) => v.length <= max, `Must be at most ${max} characters`)
    .refine((v) => v === '' || !pattern || pattern.re.test(v), pattern?.message)
    .transform((v) => (v === '' ? undefined : v))
    .optional();

/** The `create_order` RPC validates the required fields and lengths with the same rules. */
export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(100),
  line1: z.string().trim().min(1, 'Required').max(120),
  line2: optionalText(120),
  city: z.string().trim().min(1, 'Required').max(80),
  state: z.string().trim().min(1, 'Required').max(80),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{3,10}$/, 'Invalid postal code'),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use a 2-letter country code'),
  phone: optionalText(20, { re: /^\+?[0-9 ()-]{7,20}$/, message: 'Invalid phone' }),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
