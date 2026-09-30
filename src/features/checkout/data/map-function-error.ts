import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { DomainError } from '@/core/errors';

const asIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];

/** Translates an Edge Function failure (`vitrina-create-payment-intent`) into a DomainError. */
export async function mapFunctionError(error: unknown): Promise<DomainError> {
  if (error instanceof DomainError) return error;
  if (error instanceof FunctionsFetchError)
    return new DomainError({ code: 'network' }, undefined, error);
  if (error instanceof FunctionsRelayError)
    return new DomainError({ code: 'unknown' }, undefined, error);

  if (error instanceof FunctionsHttpError) {
    const context = error.context as Response | undefined;
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await context?.json();
      if (typeof parsed === 'object' && parsed !== null) body = parsed as Record<string, unknown>;
    } catch {
      return new DomainError({ code: 'unknown' }, undefined, error);
    }

    switch (body.code) {
      case 'outOfStock':
      case 'productUnavailable':
        return new DomainError(
          { code: body.code, productIds: asIds(body.productIds) },
          undefined,
          error,
        );
      case 'validation':
        return new DomainError({ code: 'validation' }, undefined, error);
      case 'paymentFailed':
        return new DomainError(
          {
            code: 'paymentFailed',
            reason: typeof body.reason === 'string' ? body.reason : 'Payment failed',
          },
          undefined,
          error,
        );
      case 'unauthorized':
        return new DomainError({ code: 'unauthorized' }, undefined, error);
      default:
        if (context?.status === 401)
          return new DomainError({ code: 'unauthorized' }, undefined, error);
    }
  }
  return new DomainError({ code: 'unknown' }, undefined, error);
}
