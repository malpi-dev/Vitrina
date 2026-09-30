import { DomainError, type DomainErrorInfo } from '../domain-error';
import { getErrorPresentation } from '../error-messages';

const cases: [DomainErrorInfo, string, string][] = [
  [
    { code: 'network' },
    "You're offline",
    "Couldn't reach the server. Check your connection and try again.",
  ],
  [{ code: 'unauthorized' }, 'Session expired', 'Please sign in again.'],
  [{ code: 'invalidCode' }, 'Invalid code', 'The code is invalid or has expired.'],
  [{ code: 'rateLimited' }, 'Too many attempts', 'Please wait a minute and try again.'],
  [{ code: 'notFound', entity: 'order' }, 'Not available', 'This order is no longer available.'],
  [{ code: 'validation' }, 'Check your details', 'Some fields are not valid.'],
  [{ code: 'outOfStock', productIds: [] }, 'Out of stock', "Some items don't have enough stock."],
  [
    { code: 'productUnavailable', productIds: [] },
    'Unavailable',
    'Some items are no longer available.',
  ],
  [{ code: 'paymentCanceled' }, 'Payment canceled', 'Payment canceled — your cart is intact.'],
  [{ code: 'paymentFailed', reason: 'Card declined' }, 'Payment failed', 'Card declined'],
  [{ code: 'conflict' }, 'Something changed', 'Please refresh and try again.'],
  [{ code: 'codeExpired' }, 'Something went wrong', 'Please try again.'],
  [{ code: 'unknown' }, 'Something went wrong', 'Please try again.'],
];

describe('getErrorPresentation', () => {
  it.each(cases)('presents %j', (info, title, message) => {
    expect(getErrorPresentation(new DomainError(info))).toEqual({ title, message });
  });

  it('treats non-domain errors as unknown', () => {
    expect(getErrorPresentation(new Error('x')).title).toBe('Something went wrong');
  });
});
