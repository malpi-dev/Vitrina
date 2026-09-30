import { DomainError } from '@/core/errors';
import type { CheckoutRepository } from '@/features/checkout/domain/checkout.repository';

// Placeholders for live repositories that do not exist yet. Each phase replaces one:
// checkout (11, when this file is deleted).
const rejected = (): Promise<never> =>
  Promise.reject(new DomainError({ code: 'unknown' }, 'Not available yet'));

export const unavailableCheckout: CheckoutRepository = {
  startCheckout: rejected,
  reportPaymentResult: rejected,
};
