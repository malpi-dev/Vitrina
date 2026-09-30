import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { DomainError } from '@/core/errors';
import type { VitrinaSupabaseClient } from '@/core/supabase';

import type { StartCheckoutInput } from '../../domain/checkout.repository';
import { mapFunctionError } from '../map-function-error';
import { SupabaseCheckoutRepository } from '../supabase-checkout.repository';

const ORDER_ID = '33333333-3333-4333-8333-333333333333';
const PRODUCT_ID = '44444444-4444-4444-8444-444444444444';

const input: StartCheckoutInput = {
  items: [{ productId: PRODUCT_ID, quantity: 2 }],
  shippingAddress: {
    fullName: 'Test Shopper',
    line1: '1 Main St',
    city: 'Springfield',
    state: 'IL',
    postalCode: '12345',
    country: 'US',
  } as StartCheckoutInput['shippingAddress'],
};

const httpError = (status: number, body: unknown) =>
  new FunctionsHttpError(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );

function setup(result: { data?: unknown; error?: unknown } | Error) {
  const invoke = jest.fn(() =>
    result instanceof Error
      ? Promise.reject(result)
      : Promise.resolve({ data: null, error: null, ...result }),
  );
  const client = { functions: { invoke } } as unknown as VitrinaSupabaseClient;
  return { repo: new SupabaseCheckoutRepository(client), invoke };
}

const catchError = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as DomainError;
  }
  throw new Error('expected rejection');
};

describe('SupabaseCheckoutRepository', () => {
  it('invokes the function with only items and address (no prices)', async () => {
    const { repo, invoke } = setup({
      data: { orderId: ORDER_ID, clientSecret: 'pi_1_secret_x', totalCents: 2599 },
    });
    await repo.startCheckout(input);
    expect(invoke).toHaveBeenCalledWith('vitrina-create-payment-intent', {
      body: { items: input.items, shippingAddress: input.shippingAddress },
    });
  });

  it('returns the session for a valid response', async () => {
    const { repo } = setup({
      data: { orderId: ORDER_ID, clientSecret: 'pi_1_secret_x', totalCents: 2599 },
    });
    await expect(repo.startCheckout(input)).resolves.toEqual({
      orderId: ORDER_ID,
      clientSecret: 'pi_1_secret_x',
      totalCents: 2599,
    });
  });

  it('maps a 409 outOfStock with the affected ids', async () => {
    const { repo } = setup({
      error: httpError(409, { code: 'outOfStock', productIds: [PRODUCT_ID] }),
    });
    const error = await catchError(repo.startCheckout(input));
    expect(error).toBeInstanceOf(DomainError);
    expect(error.info).toEqual({ code: 'outOfStock', productIds: [PRODUCT_ID] });
  });

  it('maps a 401 to unauthorized', async () => {
    const { repo } = setup({ error: httpError(401, { code: 'unauthorized' }) });
    expect((await catchError(repo.startCheckout(input))).code).toBe('unauthorized');
  });

  it('maps a network failure to network', async () => {
    const { repo } = setup({ error: new FunctionsFetchError(new TypeError('Failed to fetch')) });
    expect((await catchError(repo.startCheckout(input))).code).toBe('network');
  });

  it('maps a thrown error too', async () => {
    const { repo } = setup(new FunctionsFetchError(new TypeError('Failed to fetch')));
    expect((await catchError(repo.startCheckout(input))).code).toBe('network');
  });

  it('rejects a malformed response with unknown', async () => {
    for (const data of [
      null,
      { orderId: 'nope', clientSecret: 'x', totalCents: 1 },
      { orderId: ORDER_ID },
    ]) {
      const { repo } = setup({ data });
      expect((await catchError(repo.startCheckout(input))).code).toBe('unknown');
    }
  });

  it('reportPaymentResult is a no-op', async () => {
    const { repo, invoke } = setup({});
    await expect(repo.reportPaymentResult()).resolves.toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('mapFunctionError', () => {
  it('maps the rest of the codes', async () => {
    expect((await mapFunctionError(httpError(422, { code: 'validation' }))).code).toBe(
      'validation',
    );
    expect(
      (await mapFunctionError(httpError(409, { code: 'productUnavailable', productIds: ['a', 1] })))
        .info,
    ).toEqual({ code: 'productUnavailable', productIds: ['a'] });
    expect(
      (
        await mapFunctionError(
          httpError(502, { code: 'paymentFailed', reason: 'Payment provider unavailable' }),
        )
      ).info,
    ).toEqual({ code: 'paymentFailed', reason: 'Payment provider unavailable' });
    expect((await mapFunctionError(httpError(502, { code: 'paymentFailed' }))).info).toEqual({
      code: 'paymentFailed',
      reason: 'Payment failed',
    });
    expect((await mapFunctionError(httpError(401, {}))).code).toBe('unauthorized');
    expect((await mapFunctionError(httpError(500, { code: 'unknown' }))).code).toBe('unknown');
  });

  it('falls back to unknown for unparsable bodies, relay errors and strange values', async () => {
    expect((await mapFunctionError(httpError(500, 'not json'))).code).toBe('unknown');
    expect((await mapFunctionError(new FunctionsRelayError(new Error('relay')))).code).toBe(
      'unknown',
    );
    expect((await mapFunctionError('boom')).code).toBe('unknown');
  });

  it('passes DomainError through', async () => {
    const error = new DomainError({ code: 'notFound', entity: 'order' });
    expect(await mapFunctionError(error)).toBe(error);
  });
});
