import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
});

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
