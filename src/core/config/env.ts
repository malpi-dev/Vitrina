import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  EXPO_PUBLIC_MERCHANT_DISPLAY_NAME: z.string().min(1).default('Vitrina'),
  EXPO_PUBLIC_FORCE_DEMO: z.enum(['true', 'false']).default('false'),
});

// Expo only inlines EXPO_PUBLIC_* when accessed statically, so list them explicitly.
const parsed = schema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined,
  EXPO_PUBLIC_MERCHANT_DISPLAY_NAME: process.env.EXPO_PUBLIC_MERCHANT_DISPLAY_NAME || undefined,
  EXPO_PUBLIC_FORCE_DEMO: process.env.EXPO_PUBLIC_FORCE_DEMO || undefined,
});

const data = parsed.success ? parsed.data : null;

export const env = {
  supabaseUrl: data?.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: data?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  stripePublishableKey: data?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  merchantDisplayName: data?.EXPO_PUBLIC_MERCHANT_DISPLAY_NAME ?? 'Vitrina',
};

/** Live mode needs Supabase AND Stripe (checkout). Without them the app runs demo-only. */
export const isBackendConfigured = Boolean(
  env.supabaseUrl && env.supabasePublishableKey && env.stripePublishableKey,
);
export const isDemoForced = !isBackendConfigured || data?.EXPO_PUBLIC_FORCE_DEMO === 'true';
