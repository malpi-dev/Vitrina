import { errorJson, json } from "../_shared/http.ts";

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: Record<string, string>;
      last_payment_error?: { message?: string } | null;
    };
  };
}

export interface WebhookDeps {
  /** Throws if the signature is invalid. */
  verify(rawBody: string, signature: string): Promise<WebhookEvent>;
  /** Inserts into vitrina.stripe_events; a unique violation (23505) means 'duplicate'. */
  recordEvent(id: string, type: string): Promise<"new" | "duplicate">;
  /** Deletes the row so Stripe can retry the event. */
  forgetEvent(id: string): Promise<void>;
  markOrderPaid(paymentIntentId: string): Promise<void>;
  recordPaymentFailure(paymentIntentId: string, message: string): Promise<void>;
}

export function createHandler(deps: WebhookDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== "POST") return errorJson(405, "methodNotAllowed");
    const signature = req.headers.get("stripe-signature");
    if (!signature) return errorJson(400, "missingSignature");

    // The raw body: the signature is computed over the exact bytes Stripe sent.
    const rawBody = await req.text();
    let event: WebhookEvent;
    try {
      event = await deps.verify(rawBody, signature);
    } catch {
      return errorJson(400, "invalidSignature");
    }

    const object = event.data.object;
    // Events that do not belong to a Vitrina order (e.g. other apps sharing the account) are ignored.
    if (!object.metadata?.order_id) return json(200, { received: true, ignored: true });

    if ((await deps.recordEvent(event.id, event.type)) === "duplicate") {
      return json(200, { received: true, duplicate: true });
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        await deps.markOrderPaid(object.id);
      } else if (event.type === "payment_intent.payment_failed") {
        await deps.recordPaymentFailure(
          object.id,
          object.last_payment_error?.message ?? "payment_failed",
        );
      }
    } catch {
      console.error("webhook processing failed", { event_id: event.id, pi: object.id });
      // Let Stripe retry; mark_order_paid is idempotent.
      await deps.forgetEvent(event.id).catch(() => undefined);
      return errorJson(500, "processingFailed");
    }

    return json(200, { received: true });
  };
}
