import { adminClient, userClient } from "../_shared/supabase.ts";
import { createStripe } from "../_shared/stripe.ts";
import { createHandler, type OrderRef } from "./handler.ts";

Deno.serve(
  createHandler({
    async createOrder(authHeader, items, address) {
      const { data, error } = await userClient(authHeader)
        .schema("vitrina")
        .rpc("create_order", { p_items: items, p_shipping_address: address });
      if (error) {
        return {
          ok: false,
          error: { code: error.code, message: error.message, details: error.details },
        };
      }
      return { ok: true, order: data as unknown as OrderRef };
    },
    async createPaymentIntent(order) {
      const intent = await createStripe().paymentIntents.create(
        {
          amount: order.total_cents,
          currency: "usd",
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          metadata: { order_id: order.id, user_id: order.user_id },
        },
        { idempotencyKey: order.id },
      );
      if (!intent.client_secret) throw new Error("PaymentIntent without client_secret");
      return { id: intent.id, client_secret: intent.client_secret };
    },
    async attachPaymentIntent(orderId, paymentIntentId) {
      const { error } = await adminClient().schema("vitrina").rpc("attach_payment_intent", {
        p_order_id: orderId,
        p_payment_intent_id: paymentIntentId,
      });
      if (error) throw new Error(error.message);
    },
  }),
);
