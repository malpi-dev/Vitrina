import { fullNameSchema } from '../profile';

describe('fullNameSchema', () => {
  it('trims the name', () => {
    expect(fullNameSchema.parse({ fullName: '  Ada Lovelace ' })).toEqual({
      fullName: 'Ada Lovelace',
    });
  });

  it('requires a non-blank name', () => {
    for (const fullName of ['', '   ']) {
      const r = fullNameSchema.safeParse({ fullName });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe('Required');
    }
  });

  it('allows up to 100 characters', () => {
    expect(fullNameSchema.safeParse({ fullName: 'a'.repeat(100) }).success).toBe(true);
    expect(fullNameSchema.safeParse({ fullName: 'a'.repeat(101) }).success).toBe(false);
  });
});
