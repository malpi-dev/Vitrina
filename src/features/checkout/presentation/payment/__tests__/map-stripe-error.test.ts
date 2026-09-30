import { mapStripeError } from '../map-stripe-error';

describe('mapStripeError', () => {
  it('prefers localizedMessage, then message, then a default', () => {
    expect(mapStripeError({ localizedMessage: 'a', message: 'b' })).toBe('a');
    expect(mapStripeError({ message: 'b' })).toBe('b');
    expect(mapStripeError({})).toBe('Payment failed');
  });
});
