import { shippingAddressSchema } from '../shipping-address';

const valid = {
  fullName: 'Ada Lovelace',
  line1: '12 Analytical St',
  city: 'London',
  state: 'LN',
  postalCode: 'SW1A 1AA',
  country: 'GB',
};

describe('shippingAddressSchema', () => {
  it('accepts a minimal valid address', () => {
    expect(shippingAddressSchema.parse(valid)).toEqual(valid);
  });

  it('accepts all optional fields', () => {
    const full = { ...valid, line2: 'Apt 4', phone: '+1 (555) 123-4567' };
    expect(shippingAddressSchema.parse(full)).toEqual(full);
  });

  it('trims values and upper-cases the country', () => {
    const r = shippingAddressSchema.parse({
      ...valid,
      fullName: '  Ada  ',
      country: ' gb ',
      postalCode: ' 12345 ',
    });
    expect(r).toMatchObject({ fullName: 'Ada', country: 'GB', postalCode: '12345' });
  });

  it('turns blank line2 and phone into undefined', () => {
    const r = shippingAddressSchema.parse({ ...valid, line2: '', phone: '   ' });
    expect(r.line2).toBeUndefined();
    expect(r.phone).toBeUndefined();
  });

  it.each(['fullName', 'line1', 'city', 'state', 'postalCode', 'country'] as const)(
    'requires %s',
    (key) => {
      expect(shippingAddressSchema.safeParse({ ...valid, [key]: '' }).success).toBe(false);
      expect(shippingAddressSchema.safeParse({ ...valid, [key]: undefined }).success).toBe(false);
    },
  );

  it('enforces maximum lengths', () => {
    expect(shippingAddressSchema.safeParse({ ...valid, fullName: 'a'.repeat(101) }).success).toBe(
      false,
    );
    expect(shippingAddressSchema.safeParse({ ...valid, line1: 'a'.repeat(121) }).success).toBe(
      false,
    );
    expect(shippingAddressSchema.safeParse({ ...valid, line2: 'a'.repeat(121) }).success).toBe(
      false,
    );
    expect(shippingAddressSchema.safeParse({ ...valid, city: 'a'.repeat(81) }).success).toBe(false);
    expect(shippingAddressSchema.safeParse({ ...valid, state: 'a'.repeat(81) }).success).toBe(
      false,
    );
    expect(shippingAddressSchema.safeParse({ ...valid, fullName: 'a'.repeat(100) }).success).toBe(
      true,
    );
  });

  it('validates the postal code', () => {
    for (const postalCode of ['12', '12345678901', 'AB#123']) {
      const r = shippingAddressSchema.safeParse({ ...valid, postalCode });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe('Invalid postal code');
    }
  });

  it('validates the country code', () => {
    for (const country of ['USA', 'U', '1A']) {
      const r = shippingAddressSchema.safeParse({ ...valid, country });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe('Use a 2-letter country code');
    }
  });

  it('validates the phone', () => {
    for (const phone of ['12345', 'abcdefghij', '1'.repeat(21)]) {
      expect(shippingAddressSchema.safeParse({ ...valid, phone }).success).toBe(false);
    }
    const r = shippingAddressSchema.safeParse({ ...valid, phone: '12345' });
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Invalid phone');
  });
});
