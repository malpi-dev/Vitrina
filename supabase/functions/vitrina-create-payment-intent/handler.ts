import { errorJson, json } from "../_shared/http.ts";

export interface OrderRef {
  id: string;
  user_id: string;
  total_cents: number;
}

export interface CreatePaymentIntentDeps {
  createOrder(
    authHeader: string,
    items: { productId: string; quantity: number }[],
    address: unknown,
  ): Promise<
    | { ok: true; order: OrderRef }
    | { ok: false; error: { code?: string; message?: string; details?: string } }
  >;
  createPaymentIntent(order: OrderRef): Promise<{ id: string; client_secret: string }>;
  attachPaymentIntent(orderId: string, paymentIntentId: string): Promise<void>;
}

interface Item {
  productId: string;
  quantity: number;
}

function parseBody(body: unknown): { items: Item[]; shippingAddress: unknown } | null {
  if (typeof body !== "object" || body === null) return null;
  const { items, shippingAddress } = body as Record<string, unknown>;
  if (!Array.isArray(items) || items.length === 0) return null;
  if (typeof shippingAddress !== "object" || shippingAddress === null) return null;
  const parsed: Item[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) return null;
    const { productId, quantity } = item as Record<string, unknown>;
    if (typeof productId !== "string" || typeof quantity !== "number") return null;
    // Only these two fields are forwarded: prices always come from the database.
    parsed.push({ productId, quantity });
  }
  return { items: parsed, shippingAddress };
}

function parseIds(details: string | undefined): string[] {
  try {
    const ids: unknown = JSON.parse(details ?? "[]");
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function createHandler(deps: CreatePaymentIntentDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== "POST") return errorJson(405, "methodNotAllowed");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorJson(401, "unauthorized");

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return errorJson(422, "validation");
    }
    const body = parseBody(raw);
    if (!body) return errorJson(422, "validation");

    const created = await deps.createOrder(authHeader, body.items, body.shippingAddress);
    if (!created.ok) {
      const { code, message, details } = created.error;
      if (message === "outOfStock" || message === "productUnavailable") {
        return errorJson(409, message, { productIds: parseIds(details) });
      }
      if (message === "validation") return errorJson(422, "validation");
      if (message === "unauthorized" || code === "PGRST301" || code === "401") {
        return errorJson(401, "unauthorized");
      }
      console.error("create_order failed", { pgCode: code });
      return errorJson(500, "unknown");
    }

    const { order } = created;
    let intent: { id: string; client_secret: string };
    try {
      intent = await deps.createPaymentIntent(order);
    } catch {
      console.error("payment intent creation failed", { order_id: order.id });
      return errorJson(502, "paymentFailed", { reason: "Payment provider unavailable" });
    }

    try {
      await deps.attachPaymentIntent(order.id, intent.id);
    } catch {
      console.error("attach_payment_intent failed", { order_id: order.id, pi: intent.id });
      return errorJson(500, "unknown");
    }

    return json(200, {
      orderId: order.id,
      clientSecret: intent.client_secret,
      totalCents: order.total_cents,
    });
  };
}
