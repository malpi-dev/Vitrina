import { assertEquals, assertRejects } from "@std/assert";

import { Stripe, verifyStripeSignature } from "./stripe.ts";

// Local test-only secret: generated for this test, not a real Stripe credential.
const SECRET = "whsec" + "_local_test_secret";
const payload = JSON.stringify({
  id: "evt_1",
  object: "event",
  type: "payment_intent.succeeded",
  data: { object: { id: "pi_1", metadata: { order_id: "o1" } } },
});
const stripe = new Stripe("unused", { httpClient: Stripe.createFetchHttpClient() });

Deno.test("verifyStripeSignature accepts a correctly signed body", async () => {
  const header = await stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: SECRET,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  const event = await verifyStripeSignature(payload, header, SECRET);
  assertEquals(event.id, "evt_1");
});

Deno.test("verifyStripeSignature rejects a tampered body", async () => {
  const header = await stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: SECRET,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  await assertRejects(() => verifyStripeSignature(payload + " ", header, SECRET));
});

Deno.test("verifyStripeSignature rejects a signature made with another secret", async () => {
  const header = await stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: "whsec" + "_other",
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  await assertRejects(() => verifyStripeSignature(payload, header, SECRET));
});
