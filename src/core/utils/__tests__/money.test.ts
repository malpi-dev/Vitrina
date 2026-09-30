import { formatMoney, isValidCents } from '../money';

describe('formatMoney', () => {
  it.each([
    [0, '$0.00'],
    [499, '$4.99'],
    [5000, '$50.00'],
    [120000, '$1,200.00'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});

describe('isValidCents', () => {
  it('accepts non-negative integers', () => {
    expect(isValidCents(0)).toBe(true);
    expect(isValidCents(4999)).toBe(true);
  });
  it('rejects fractions and negatives', () => {
    expect(isValidCents(4.5)).toBe(false);
    expect(isValidCents(-1)).toBe(false);
  });
});
