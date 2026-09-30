import { assertEquals } from "@std/assert";

import { createHandler, type CreatePaymentIntentDeps, type OrderRef } from "./handler.ts";

const order: OrderRef = { id: "order-1", user_id: "user-1", total_cents: 2599 };
const validBody = {
  items: [{ productId: "p1", quantity: 2 }],
  shippingAddress: { line1: "1 Main St" },
};

function setup(overrides: Partial<CreatePaymentIntentDeps> = {}) {
  const calls = {
    createOrder: [] as unknown[][],
    createPaymentIntent: [] as OrderRef[],
    attach: [] as string[][],
  };
  const deps: CreatePaymentIntentDeps = {
    createOrder: (auth, items, address) => {
      calls.createOrder.push([auth, items, address]);
      return Promise.resolve({ ok: true, order });
    },
    createPaymentIntent: (o) => {
      calls.createPaymentIntent.push(o);
      return Promise.resolve({ id: "pi_1", client_secret: "pi_1_secret_x" });
    },
    attachPaymentIntent: (orderId, pi) => {
      calls.attach.push([orderId, pi]);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { handler: createHandler(deps), calls };
}

const post = (body: unknown, headers: Record<string, string> = { Authorization: "Bearer t" }) =>
  new Request("http://x/", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

Deno.test("405 for non-POST", async () => {
  const { handler } = setup();
  const res = await handler(new Request("http://x/", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("401 without Authorization", async () => {
  const { handler, calls } = setup();
  const res = await handler(post(validBody, {}));
  assertEquals(res.status, 401);
  assertEquals((await res.json()).code, "unauthorized");
  assertEquals(calls.createOrder.length, 0);
});

Deno.test("422 for invalid JSON", async () => {
  const { handler } = setup();
  const res = await handler(post("{nope"));
  assertEquals(res.status, 422);
  assertEquals((await res.json()).code, "validation");
});

Deno.test("422 for invalid shape", async () => {
  const { handler } = setup();
  for (
    const body of [
      {},
      { items: [], shippingAddress: {} },
      { items: [{ productId: 1, quantity: 1 }], shippingAddress: {} },
      { items: [{ productId: "p", quantity: "2" }], shippingAddress: {} },
      { items: [{ productId: "p", quantity: 1 }] },
      null,
    ]
  ) {
    assertEquals((await handler(post(body))).status, 422);
  }
});

Deno.test("forwards only productId and quantity (extra fields are dropped)", async () => {
  const { handler, calls } = setup();
  const res = await handler(
    post({
      items: [{ productId: "p1", quantity: 1, priceCents: 1, name: "hacked" }],
      shippingAddress: { line1: "x" },
    }),
  );
  assertEquals(res.status, 200);
  assertEquals(calls.createOrder[0], ["Bearer t", [{ productId: "p1", quantity: 1 }], {
    line1: "x",
  }]);
});

Deno.test("409 with productIds for outOfStock and productUnavailable", async () => {
  for (const message of ["outOfStock", "productUnavailable"]) {
    const { handler, calls } = setup({
      createOrder: () =>
        Promise.resolve({ ok: false, error: { code: "P0001", message, details: '["p1","p2"]' } }),
    });
    const res = await handler(post(validBody));
    assertEquals(res.status, 409);
    assertEquals(await res.json(), { code: message, productIds: ["p1", "p2"] });
    assertEquals(calls.createPaymentIntent.length, 0);
  }
});

Deno.test("maps validation, unauthorized and unknown RPC errors", async () => {
  const cases: [{ code?: string; message?: string }, number, string][] = [
    [{ code: "P0001", message: "validation" }, 422, "validation"],
    [{ code: "P0001", message: "unauthorized" }, 401, "unauthorized"],
    [{ code: "PGRST301", message: "JWT expired" }, 401, "unauthorized"],
    [{ code: "XX000", message: "boom" }, 500, "unknown"],
  ];
  for (const [error, status, code] of cases) {
    const { handler } = setup({ createOrder: () => Promise.resolve({ ok: false, error }) });
    const res = await handler(post(validBody));
    assertEquals(res.status, status);
    assertEquals((await res.json()).code, code);
  }
});

Deno.test("502 when Stripe fails", async () => {
  const { handler, calls } = setup({ createPaymentIntent: () => Promise.reject(new Error("x")) });
  const res = await handler(post(validBody));
  assertEquals(res.status, 502);
  assertEquals(await res.json(), {
    code: "paymentFailed",
    reason: "Payment provider unavailable",
  });
  assertEquals(calls.attach.length, 0);
});

Deno.test("500 when attaching the PaymentIntent fails", async () => {
  const { handler } = setup({ attachPaymentIntent: () => Promise.reject(new Error("x")) });
  const res = await handler(post(validBody));
  assertEquals(res.status, 500);
});

Deno.test("200 returns the body and charges the server total", async () => {
  const { handler, calls } = setup();
  const res = await handler(post(validBody));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    orderId: "order-1",
    clientSecret: "pi_1_secret_x",
    totalCents: 2599,
  });
  assertEquals(calls.createPaymentIntent[0].total_cents, 2599);
  assertEquals(calls.attach[0], ["order-1", "pi_1"]);
});
