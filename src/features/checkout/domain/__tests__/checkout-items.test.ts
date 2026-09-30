import { DomainError } from '@/core/errors';
import type { CartItem } from '@/features/cart/domain/cart-item';

import { toCheckoutItems, validateCheckoutItems } from '../checkout-items';

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));

function validationError(fn: () => void): DomainError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    return e as DomainError;
  }
  throw new Error('expected validateCheckoutItems to throw');
}

describe('toCheckoutItems', () => {
  it('keeps only ids and quantities', () => {
    const cart: CartItem[] = [
      {
        productId: 'a',
        quantity: 3,
        snapshot: { name: 'A', priceCents: 100, imageUrl: null },
        addedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(toCheckoutItems(cart)).toEqual([{ productId: 'a', quantity: 3 }]);
  });
});

describe('validateCheckoutItems', () => {
  it('accepts 1 and 20 lines and quantities 1 and 10', () => {
    expect(() => validateCheckoutItems(items(1))).not.toThrow();
    expect(() => validateCheckoutItems(items(20))).not.toThrow();
    expect(() => validateCheckoutItems([{ productId: 'a', quantity: 10 }])).not.toThrow();
  });

  it('rejects 0 lines', () => {
    expect(validationError(() => validateCheckoutItems([])).code).toBe('validation');
  });

  it('rejects 21 lines', () => {
    expect(validationError(() => validateCheckoutItems(items(21))).code).toBe('validation');
  });

  it.each([0, 11, 1.5, -1, NaN])('rejects quantity %s', (quantity) => {
    const err = validationError(() => validateCheckoutItems([{ productId: 'a', quantity }]));
    expect(err.code).toBe('validation');
  });

  it('rejects duplicated products', () => {
    const err = validationError(() =>
      validateCheckoutItems([
        { productId: 'a', quantity: 1 },
        { productId: 'a', quantity: 2 },
      ]),
    );
    expect(err.info).toMatchObject({ code: 'validation', fields: { items: expect.any(String) } });
  });
});
