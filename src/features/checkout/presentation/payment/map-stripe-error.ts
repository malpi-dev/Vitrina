export interface StripeErrorLike {
  code?: string;
  message?: string;
  localizedMessage?: string;
}

/** The message Stripe wants shown to the user (localized when available). */
export function mapStripeError(error: StripeErrorLike): string {
  return error.localizedMessage ?? error.message ?? 'Payment failed';
}
