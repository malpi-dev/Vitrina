import { emailSchema, otpSchema } from '../validation';

describe('emailSchema', () => {
  it('trims and lower-cases', () => {
    expect(emailSchema.parse({ email: '  Ada@Example.COM ' })).toEqual({
      email: 'ada@example.com',
    });
  });

  it.each(['', 'ada', 'ada@', '@example.com', 'ada@example', 'a b@example.com'])(
    'rejects %p',
    (email) => {
      const r = emailSchema.safeParse({ email });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe('Enter a valid email');
    },
  );
});

describe('otpSchema', () => {
  it('accepts exactly six digits', () => {
    expect(otpSchema.parse({ code: '012345' })).toEqual({ code: '012345' });
  });

  it.each(['', '12345', '1234567', '12345a', '12 456', ' 123456'])('rejects %p', (code) => {
    const r = otpSchema.safeParse({ code });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Enter the 6-digit code');
  });
});
