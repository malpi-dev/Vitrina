export type PaymentOutcome =
  { status: 'succeeded' } | { status: 'canceled' } | { status: 'failed'; reason: string };
