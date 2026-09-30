import { canTransition, type OrderStatus } from '../order-status';

const ALL: OrderStatus[] = ['pending_payment', 'paid', 'shipped', 'delivered', 'canceled'];

const ALLOWED = new Set([
  'pending_payment>paid',
  'pending_payment>canceled',
  'paid>shipped',
  'shipped>delivered',
  'canceled>paid',
]);

describe('canTransition', () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const expected = ALLOWED.has(`${from}>${to}`);
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'forbidden'}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }
});
