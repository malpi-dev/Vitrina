const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats an integer amount of cents as USD, e.g. 499 -> "$4.99". Presentation only. */
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

export const isValidCents = (value: number): boolean => Number.isInteger(value) && value >= 0;
