import { z } from 'zod';

import { DomainError } from '@/core/errors';
import type { VitrinaSupabaseClient } from '@/core/supabase';

import type { CheckoutRepository, StartCheckoutInput } from '../domain/checkout.repository';
import type { CheckoutSession } from '../domain/checkout-session';

import { mapFunctionError } from './map-function-error';

const responseSchema = z.object({
  orderId: z.uuid(),
  clientSecret: z.string().min(1),
  totalCents: z.number().int().min(0),
});

export class SupabaseCheckoutRepository implements CheckoutRepository {
  constructor(private readonly client: VitrinaSupabaseClient) {}

  async startCheckout(input: StartCheckoutInput): Promise<CheckoutSession> {
    let result;
    try {
      // supabase-js attaches the signed-in user's JWT. Prices are never sent: the server computes them.
      result = await this.client.functions.invoke('vitrina-create-payment-intent', {
        body: { items: input.items, shippingAddress: input.shippingAddress },
      });
    } catch (e) {
      throw await mapFunctionError(e);
    }
    if (result.error) throw await mapFunctionError(result.error);

    const parsed = responseSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new DomainError({ code: 'unknown' }, 'Malformed checkout response', parsed.error);
    }
    return parsed.data;
  }

  async reportPaymentResult(): Promise<void> {
    // Intentionally a no-op: in live mode only the Stripe webhook may mark an order as paid
    // (the client result is not trustworthy and RLS forbids clients from updating orders).
  }
}
