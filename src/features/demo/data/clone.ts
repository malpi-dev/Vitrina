/** Deep clone for plain data that preserves `Date` (unlike JSON) and works on every JS engine. */
export function clone<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((v) => clone(v)) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = clone(v);
    return out as T;
  }
  return value;
}
