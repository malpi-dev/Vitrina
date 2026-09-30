import Stripe from "stripe";

import { stripeSecretKey } from "./env.ts";

export { Stripe };

export function createStripe(): Stripe {
  return new Stripe(stripeSecretKey(), { httpClient: Stripe.createFetchHttpClient() });
}

/** Verifies the webhook signature over the raw body. Throws if it is invalid or too old. */
export async function verifyStripeSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<Stripe.Event> {
  // Signature verification does not call the Stripe API, so any placeholder API key works.
  const stripe = new Stripe("unused", { httpClient: Stripe.createFetchHttpClient() });
  return await stripe.webhooks.constructEventAsync(
    rawBody,
    signature,
    webhookSecret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}
