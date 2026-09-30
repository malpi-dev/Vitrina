import { buildOrderTimeline } from '../build-order-timeline';
import type { Order } from '../order';

const d = (day: number) => new Date(Date.UTC(2026, 0, day));

const base: Pick<Order, 'createdAt' | 'paidAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'> = {
  createdAt: d(1),
  paidAt: null,
  shippedAt: null,
  deliveredAt: null,
  canceledAt: null,
};

const states = (t: ReturnType<typeof buildOrderTimeline>) => t.steps.map((s) => s.state);

describe('buildOrderTimeline', () => {
  it('always returns the four steps in order', () => {
    const t = buildOrderTimeline({ ...base, status: 'paid', paidAt: d(2) });
    expect(t.steps.map((s) => s.key)).toEqual(['placed', 'paid', 'shipped', 'delivered']);
  });

  it('pending_payment: placed is current', () => {
    const t = buildOrderTimeline({ ...base, status: 'pending_payment' });
    expect(states(t)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(t.steps[0]?.at).toEqual(d(1));
    expect(t.canceledAt).toBeNull();
  });

  it('paid: paid is current', () => {
    const t = buildOrderTimeline({ ...base, status: 'paid', paidAt: d(2) });
    expect(states(t)).toEqual(['done', 'current', 'upcoming', 'upcoming']);
    expect(t.steps[1]?.at).toEqual(d(2));
  });

  it('shipped: shipped is current', () => {
    const t = buildOrderTimeline({ ...base, status: 'shipped', paidAt: d(2), shippedAt: d(3) });
    expect(states(t)).toEqual(['done', 'done', 'current', 'upcoming']);
    expect(t.steps[2]?.at).toEqual(d(3));
  });

  it('delivered: delivered is current', () => {
    const t = buildOrderTimeline({
      ...base,
      status: 'delivered',
      paidAt: d(2),
      shippedAt: d(3),
      deliveredAt: d(4),
    });
    expect(states(t)).toEqual(['done', 'done', 'done', 'current']);
    expect(t.steps.map((s) => s.at)).toEqual([d(1), d(2), d(3), d(4)]);
  });

  it('keeps null dates for steps without a date', () => {
    const t = buildOrderTimeline({ ...base, status: 'shipped' });
    expect(t.steps.map((s) => s.at)).toEqual([d(1), null, null, null]);
  });

  it('canceled: only placed is done and canceledAt is set', () => {
    const t = buildOrderTimeline({ ...base, status: 'canceled', canceledAt: d(2) });
    expect(states(t)).toEqual(['done', 'upcoming', 'upcoming', 'upcoming']);
    expect(t.canceledAt).toEqual(d(2));
    expect(t.steps[0]?.at).toEqual(d(1));
  });

  it('canceled ignores stale payment dates and tolerates a null canceledAt', () => {
    const t = buildOrderTimeline({ ...base, status: 'canceled', paidAt: d(2) });
    expect(t.steps.map((s) => s.at)).toEqual([d(1), null, null, null]);
    expect(t.canceledAt).toBeNull();
  });
});
