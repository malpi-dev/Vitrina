import { assertEquals } from "@std/assert";

import { createHandler, type WebhookDeps, type WebhookEvent } from "./handler.ts";

const event = (type: string, metadata: Record<string, string> | undefined = { order_id: "o1" }) =>
  ({
    id: "evt_1",
    type,
    data: { object: { id: "pi_1", metadata, last_payment_error: { message: "Card declined" } } },
  }) as WebhookEvent;

function setup(overrides: Partial<WebhookDeps> & { evt?: WebhookEvent } = {}) {
  const calls = {
    recorded: [] as string[],
    forgotten: [] as string[],
    paid: [] as string[],
    failed: [] as string[][],
  };
  const { evt = event("payment_intent.succeeded"), ...rest } = overrides;
  const deps: WebhookDeps = {
    verify: () => Promise.resolve(evt),
    recordEvent: (id) => {
      calls.recorded.push(id);
      return Promise.resolve("new");
    },
    forgetEvent: (id) => {
      calls.forgotten.push(id);
      return Promise.resolve();
    },
    markOrderPaid: (pi) => {
      calls.paid.push(pi);
      return Promise.resolve();
    },
    recordPaymentFailure: (pi, message) => {
      calls.failed.push([pi, message]);
      return Promise.resolve();
    },
    ...rest,
  };
  return { handler: createHandler(deps), calls };
}

const post = (headers: Record<string, string> = { "stripe-signature": "sig" }) =>
  new Request("http://x/", { method: "POST", headers, body: "{}" });

Deno.test("405 for non-POST", async () => {
  const { handler } = setup();
  assertEquals((await handler(new Request("http://x/"))).status, 405);
});

Deno.test("400 without signature", async () => {
  const { handler } = setup();
  assertEquals((await handler(post({}))).status, 400);
});

Deno.test("400 with an invalid signature", async () => {
  const { handler, calls } = setup({ verify: () => Promise.reject(new Error("bad")) });
  assertEquals((await handler(post())).status, 400);
  assertEquals(calls.recorded.length, 0);
});

Deno.test("verifies the raw body", async () => {
  let seen = "";
  const { handler } = setup({
    verify: (raw) => {
      seen = raw;
      return Promise.resolve(event("payment_intent.succeeded"));
    },
  });
  await handler(
    new Request("http://x/", {
      method: "POST",
      headers: { "stripe-signature": "s" },
      body: '{"a":  1}',
    }),
  );
  assertEquals(seen, '{"a":  1}');
});

Deno.test("200 ignored for events without order_id (not recorded)", async () => {
  const { handler, calls } = setup({ evt: event("payment_intent.succeeded", {}) });
  const res = await handler(post());
  assertEquals(res.status, 200);
  assertEquals(calls.recorded.length, 0);
  assertEquals(calls.paid.length, 0);
});

Deno.test("duplicate events have no effects", async () => {
  const { handler, calls } = setup({ recordEvent: () => Promise.resolve("duplicate") });
  const res = await handler(post());
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { received: true, duplicate: true });
  assertEquals(calls.paid.length, 0);
});

Deno.test("succeeded marks the order paid", async () => {
  const { handler, calls } = setup();
  assertEquals((await handler(post())).status, 200);
  assertEquals(calls.paid, ["pi_1"]);
  assertEquals(calls.recorded, ["evt_1"]);
});

Deno.test("payment_failed records the message (or a default)", async () => {
  const { handler, calls } = setup({ evt: event("payment_intent.payment_failed") });
  assertEquals((await handler(post())).status, 200);
  assertEquals(calls.failed, [["pi_1", "Card declined"]]);

  const noMessage = {
    id: "evt_2",
    type: "payment_intent.payment_failed",
    data: { object: { id: "pi_2", metadata: { order_id: "o" }, last_payment_error: null } },
  } as WebhookEvent;
  const again = setup({ evt: noMessage });
  await again.handler(post());
  assertEquals(again.calls.failed, [["pi_2", "payment_failed"]]);
});

Deno.test("processing failure forgets the event and returns 500", async () => {
  const { handler, calls } = setup({ markOrderPaid: () => Promise.reject(new Error("db")) });
  assertEquals((await handler(post())).status, 500);
  assertEquals(calls.forgotten, ["evt_1"]);
});

Deno.test("unknown event types return 200 with no effects", async () => {
  const { handler, calls } = setup({ evt: event("charge.refunded") });
  assertEquals((await handler(post())).status, 200);
  assertEquals(calls.paid.length + calls.failed.length, 0);
});
