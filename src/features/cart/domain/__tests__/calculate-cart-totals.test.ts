import { calculateCartTotals } from '../calculate-cart-totals';
import { cartUnitCount, type CartItem } from '../cart-item';

describe('calculateCartTotals', () => {
  it('returns zeros for an empty cart (no shipping)', () => {
    expect(calculateCartTotals([])).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      itemCount: 0,
    });
  });

  it('charges $4.99 shipping at $49.99', () => {
    expect(calculateCartTotals([{ priceCents: 4999, quantity: 1 }])).toEqual({
      subtotalCents: 4999,
      shippingCents: 499,
      totalCents: 5498,
      itemCount: 1,
    });
  });

  it('ships free at exactly $50.00', () => {
    expect(calculateCartTotals([{ priceCents: 5000, quantity: 1 }])).toEqual({
      subtotalCents: 5000,
      shippingCents: 0,
      totalCents: 5000,
      itemCount: 1,
    });
  });

  it('ships free at $50.01', () => {
    const t = calculateCartTotals([{ priceCents: 5001, quantity: 1 }]);
    expect(t.shippingCents).toBe(0);
    expect(t.totalCents).toBe(5001);
  });

  it('multiplies by quantity and sums lines', () => {
    const t = calculateCartTotals([
      { priceCents: 1999, quantity: 2 },
      { priceCents: 350, quantity: 3 },
    ]);
    expect(t).toEqual({ subtotalCents: 5048, shippingCents: 0, totalCents: 5048, itemCount: 5 });
  });

  it('uses the multiplied subtotal for the free-shipping threshold', () => {
    const t = calculateCartTotals([{ priceCents: 1666, quantity: 3 }]); // 4998
    expect(t.shippingCents).toBe(499);
  });

  it('accepts a custom policy', () => {
    const policy = { flatCents: 1000, freeFromCents: 200 };
    expect(calculateCartTotals([{ priceCents: 199, quantity: 1 }], policy).totalCents).toBe(1199);
    expect(calculateCartTotals([{ priceCents: 200, quantity: 1 }], policy).shippingCents).toBe(0);
  });
});

describe('cartUnitCount', () => {
  const line = (quantity: number): CartItem => ({
    productId: `p${quantity}`,
    quantity,
    snapshot: { name: 'x', priceCents: 1, imageUrl: null },
    addedAt: '2026-01-01T00:00:00.000Z',
  });

  it('sums quantities', () => {
    expect(cartUnitCount([])).toBe(0);
    expect(cartUnitCount([line(2), line(3)])).toBe(5);
  });
});
