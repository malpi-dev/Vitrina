// Reads the environment of the Edge Functions runtime. Values are never logged.

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Reads a key from a JSON dictionary variable (`{ "default": "..." }`), falling back to a legacy variable. */
function dictionaryKey(dictionaryName: string, legacyName: string): string {
  const dictionary = Deno.env.get(dictionaryName);
  if (dictionary) {
    try {
      const key = (JSON.parse(dictionary) as Record<string, string>)["default"];
      if (key) return key;
    } catch {
      // fall through to the legacy variable
    }
  }
  return required(legacyName);
}

export const supabaseUrl = (): string => required("SUPABASE_URL");
/** Secret key (bypasses RLS). Only used by the admin client. */
export const secretKey = (): string =>
  dictionaryKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
/** Publishable key, used with the caller's Authorization header. */
export const publishableKey = (): string =>
  dictionaryKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
export const stripeSecretKey = (): string => required("VITRINA_STRIPE_SECRET_KEY");
export const stripeWebhookSecret = (): string => required("VITRINA_STRIPE_WEBHOOK_SECRET");
