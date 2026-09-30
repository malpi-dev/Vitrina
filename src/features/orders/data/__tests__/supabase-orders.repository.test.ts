import { DomainError } from '@/core/errors';
import { createFakeSupabase } from '@/test/fake-supabase';

import type { OrderRow } from '../order.mapper';
import { SupabaseOrdersRepository } from '../supabase-orders.repository';

const USER = '22222222-2222-4222-8222-222222222222';
const ORDER_ID = '33333333-3333-4333-8333-333333333333';

const row = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  id: ORDER_ID,
  short_code: 'VT-7K3Q',
  user_id: USER,
  status: 'paid',
  subtotal_cents: 5000,
  shipping_cents: 0,
  total_cents: 5000,
  currency: 'USD',
  shipping_address: {
    fullName: 'Test Shopper',
    line1: '1 Main St',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
  },
  stripe_payment_intent_id: null,
  last_payment_error: null,
  needs_refund: false,
  created_at: '2026-10-06T10:00:00+00:00',
  updated_at: '2026-10-06T10:05:00+00:00',
  paid_at: '2026-10-06T10:05:00+00:00',
  shipped_at: null,
  delivered_at: null,
  canceled_at: null,
  order_items: [
    {
      id: 'i2',
      order_id: ORDER_ID,
      product_id: 'p2',
      product_name: 'Walnut Tray',
      unit_price_cents: 3000,
      quantity: 1,
      line_total_cents: 3000,
    },
    {
      id: 'i1',
      order_id: ORDER_ID,
      product_id: 'p1',
      product_name: 'Ceramic Mug',
      unit_price_cents: 1000,
      quantity: 2,
      line_total_cents: 2000,
    },
  ],
  ...overrides,
});

function setup() {
  const fake = createFakeSupabase();
  fake.setSessionUser(USER);
  return { fake, repo: new SupabaseOrdersRepository(fake.client) };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('SupabaseOrdersRepository.list', () => {
  it('selects the orders with their items, newest first, and maps them', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [row()] });
    const [order] = await repo.list();
    expect(fake.calls).toEqual([
      ['from', 'orders'],
      ['select', '*, order_items(*)'],
      ['order', 'created_at', { ascending: false }],
    ]);
    expect(order).toMatchObject({
      id: ORDER_ID,
      shortCode: 'VT-7K3Q',
      status: 'paid',
      totalCents: 5000,
      currency: 'USD',
      lastPaymentError: null,
      shippedAt: null,
    });
    expect(order!.createdAt).toEqual(new Date('2026-10-06T10:00:00+00:00'));
    expect(order!.paidAt).toEqual(new Date('2026-10-06T10:05:00+00:00'));
    expect(order!.shippingAddress.city).toBe('Austin');
    // Sorted by product name; the frozen unit price and line total come from the row.
    expect(order!.items.map((i) => i.productName)).toEqual(['Ceramic Mug', 'Walnut Tray']);
    expect(order!.items[0]).toEqual({
      productId: 'p1',
      productName: 'Ceramic Mug',
      unitPriceCents: 1000,
      quantity: 2,
      lineTotalCents: 2000,
    });
  });

  it('returns an empty list', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [] });
    await expect(repo.list()).resolves.toEqual([]);
  });

  it('turns a network failure into a typed network error', async () => {
    const { fake, repo } = setup();
    fake.respond(new TypeError('Network request failed'));
    await expect(repo.list()).rejects.toMatchObject({ info: { code: 'network' } });
  });

  it('throws unknown when the stored address is not valid', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [row({ shipping_address: { line1: 'x' } })] });
    await expect(repo.list()).rejects.toMatchObject({ info: { code: 'unknown' } });
  });
});

describe('SupabaseOrdersRepository.getById', () => {
  it('filters by id and maps the order', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: row() });
    const order = await repo.getById(ORDER_ID);
    expect(fake.calls).toEqual([
      ['from', 'orders'],
      ['select', '*, order_items(*)'],
      ['eq', 'id', ORDER_ID],
      ['maybeSingle'],
    ]);
    expect(order.id).toBe(ORDER_ID);
  });

  it('throws notFound (entity order) when there is no row', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: null });
    const error = await repo.getById(ORDER_ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ info: { code: 'notFound', entity: 'order' } });
  });
});

describe('SupabaseOrdersRepository.subscribe', () => {
  it('subscribes to the list of the user with the orders channel', async () => {
    const { fake, repo } = setup();
    const onStatus = jest.fn();
    const unsubscribe = repo.subscribe({}, jest.fn(), onStatus);
    await flush();
    expect(fake.setAuthCalls()).toBe(1);
    expect(fake.channels).toHaveLength(1);
    expect(fake.channels[0]).toMatchObject({
      name: `vitrina:orders:${USER}`,
      filter: { event: '*', schema: 'vitrina', table: 'orders', filter: `user_id=eq.${USER}` },
      subscribed: true,
    });
    unsubscribe();
  });

  it('subscribes to one order with the order channel', async () => {
    const { fake, repo } = setup();
    const unsubscribe = repo.subscribe({ orderId: ORDER_ID }, jest.fn());
    await flush();
    expect(fake.channels[0]).toMatchObject({
      name: `vitrina:order:${ORDER_ID}`,
      filter: { schema: 'vitrina', table: 'orders', filter: `id=eq.${ORDER_ID}` },
    });
    unsubscribe();
  });

  it('re-reads the order (with its items) when a payload arrives and emits it', async () => {
    const { fake, repo } = setup();
    const onChange = jest.fn();
    const unsubscribe = repo.subscribe({}, onChange);
    await flush();
    fake.respond({ data: row({ status: 'shipped' }) });
    fake.channels[0]!.emitPayload({ eventType: 'UPDATE', new: { id: ORDER_ID } });
    await flush();
    expect(fake.calls).toContainEqual(['eq', 'id', ORDER_ID]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ id: ORDER_ID, status: 'shipped' });
    expect(onChange.mock.calls[0][0].items).toHaveLength(2);
    unsubscribe();
  });

  it('ignores a failed re-read and payloads without an id', async () => {
    const { fake, repo } = setup();
    const onChange = jest.fn();
    const unsubscribe = repo.subscribe({}, onChange);
    await flush();
    fake.channels[0]!.emitPayload({ eventType: 'DELETE', old: { id: ORDER_ID }, new: {} });
    fake.respond(new TypeError('Network request failed'));
    fake.channels[0]!.emitPayload({ eventType: 'UPDATE', new: { id: ORDER_ID } });
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('does not emit a payload that arrives after unsubscribe', async () => {
    const { fake, repo } = setup();
    const onChange = jest.fn();
    const unsubscribe = repo.subscribe({}, onChange);
    await flush();
    fake.respond({ data: row() });
    fake.channels[0]!.emitPayload({ new: { id: ORDER_ID } });
    unsubscribe();
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('translates the channel status to live / paused', async () => {
    const { fake, repo } = setup();
    const onStatus = jest.fn();
    const unsubscribe = repo.subscribe({}, jest.fn(), onStatus);
    await flush();
    const channel = fake.channels[0]!;
    channel.emitStatus('SUBSCRIBED');
    channel.emitStatus('CHANNEL_ERROR');
    channel.emitStatus('SUBSCRIBED');
    channel.emitStatus('TIMED_OUT');
    channel.emitStatus('CLOSED');
    expect(onStatus.mock.calls.map(([s]) => s)).toEqual([
      'live',
      'paused',
      'live',
      'paused',
      'paused',
    ]);
    unsubscribe();
  });

  it('reports paused and creates no channel when there is no session', async () => {
    const { fake, repo } = setup();
    fake.setSessionUser(null);
    const onStatus = jest.fn();
    repo.subscribe({}, jest.fn(), onStatus);
    await flush();
    expect(onStatus).toHaveBeenCalledWith('paused');
    expect(fake.channels).toHaveLength(0);
    expect(fake.setAuthCalls()).toBe(0);
  });

  it('reports paused when setAuth fails', async () => {
    const { fake, repo } = setup();
    fake.failSetAuth();
    const onStatus = jest.fn();
    repo.subscribe({}, jest.fn(), onStatus);
    await flush();
    expect(onStatus).toHaveBeenCalledWith('paused');
    expect(fake.channels).toHaveLength(0);
  });

  it('removes the channel on unsubscribe', async () => {
    const { fake, repo } = setup();
    const unsubscribe = repo.subscribe({}, jest.fn());
    await flush();
    unsubscribe();
    expect(fake.channels.filter((c) => !c.removed)).toHaveLength(0);
  });

  it('leaves no channel when unsubscribed before setAuth finishes', async () => {
    const { fake, repo } = setup();
    const release = fake.holdSetAuth();
    const onStatus = jest.fn();
    const unsubscribe = repo.subscribe({}, jest.fn(), onStatus);
    await flush();
    unsubscribe();
    release();
    await flush();
    expect(fake.channels).toHaveLength(0);
    expect(onStatus).not.toHaveBeenCalled();
  });
});
