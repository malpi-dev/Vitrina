import { stripeWebhookSecret } from "../_shared/env.ts";
import { verifyStripeSignature } from "../_shared/stripe.ts";
import { adminClient } from "../_shared/supabase.ts";
import { createHandler, type WebhookEvent } from "./handler.ts";

Deno.serve(
  createHandler({
    async verify(rawBody, signature) {
      const event = await verifyStripeSignature(rawBody, signature, stripeWebhookSecret());
      return event as unknown as WebhookEvent;
    },
    async recordEvent(id, type) {
      const { error } = await adminClient().schema("vitrina").from("stripe_events").insert({
        id,
        type,
      });
      if (!error) return "new";
      if (error.code === "23505") return "duplicate";
      throw new Error(error.message);
    },
    async forgetEvent(id) {
      await adminClient().schema("vitrina").from("stripe_events").delete().eq("id", id);
    },
    async markOrderPaid(paymentIntentId) {
      const { error } = await adminClient().schema("vitrina").rpc("mark_order_paid", {
        p_payment_intent_id: paymentIntentId,
      });
      if (error) throw new Error(error.message);
    },
    async recordPaymentFailure(paymentIntentId, message) {
      const { error } = await adminClient().schema("vitrina").rpc("record_payment_failure", {
        p_payment_intent_id: paymentIntentId,
        p_message: message,
      });
      if (error) throw new Error(error.message);
    },
  }),
);
