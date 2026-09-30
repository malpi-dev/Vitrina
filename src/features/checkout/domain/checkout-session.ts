export interface CheckoutSession {
  orderId: string;
  /** Absent in demo mode. */
  clientSecret?: string;
  totalCents: number;
}
