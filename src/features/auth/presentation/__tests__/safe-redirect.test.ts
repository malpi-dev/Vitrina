import { safeRedirect } from '../safe-redirect';

describe('safeRedirect', () => {
  it.each(['/checkout', '/orders', '/account', '/', '/product/abc?x=1'])('accepts %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    'http://x',
    'javascript:alert(1)',
    'evil.com/checkout',
    '/\\evil.com',
    '/redirect?to=https://evil.com',
    '',
  ])('rejects %s', (value) => {
    expect(safeRedirect(value)).toBeNull();
  });

  it('rejects undefined and arrays', () => {
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect(['/a', '/b'])).toBeNull();
  });
});
