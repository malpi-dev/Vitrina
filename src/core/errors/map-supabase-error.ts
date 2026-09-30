import { DomainError, type DomainErrorInfo } from './domain-error';

type Entity = 'product' | 'order' | 'profile';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  status?: unknown;
  name?: unknown;
}

const VALIDATION_CODES = ['23514', '22P02', '23502', '23505'];
const NETWORK_RE = /network request failed|failed to fetch|fetch failed|timeout/i;

function parseIds(details: unknown): string[] {
  if (typeof details !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(details);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function fromRaise(message: string, details: unknown, entity: Entity): DomainErrorInfo | null {
  switch (message) {
    case 'outOfStock':
      return { code: 'outOfStock', productIds: parseIds(details) };
    case 'productUnavailable':
      return { code: 'productUnavailable', productIds: parseIds(details) };
    case 'validation':
      return { code: 'validation' };
    case 'notFound':
      return { code: 'notFound', entity };
    case 'unauthorized':
      return { code: 'unauthorized' };
    case 'INVALID_TRANSITION':
      return { code: 'conflict' };
    default:
      return null;
  }
}

/** Translates PostgREST, RPC and GoTrue errors (returned or thrown) into a DomainError. */
export function mapSupabaseError(error: unknown, notFoundEntity: Entity = 'product'): DomainError {
  if (error instanceof DomainError) return error;

  const e: ErrorLike = typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
  const code = typeof e.code === 'string' ? e.code : undefined;
  const message = typeof e.message === 'string' ? e.message : '';
  const make = (info: DomainErrorInfo, msg?: string) =>
    new DomainError(info, msg ?? (message || undefined), error);

  if (code === 'P0001') {
    const info = fromRaise(message, e.details, notFoundEntity);
    if (info) return make(info);
  }
  if (code === 'PGRST116') return make({ code: 'notFound', entity: notFoundEntity });
  if (code === 'PGRST301' || e.status === 401 || e.name === 'AuthSessionMissingError') {
    return make({ code: 'unauthorized' });
  }
  if (code === '42501') return make({ code: 'unauthorized' });
  if (code && VALIDATION_CODES.includes(code)) return make({ code: 'validation' });
  if (code === 'otp_expired') {
    return make({ code: 'invalidCode' }, 'The code is invalid or has expired');
  }
  if ((code?.startsWith('over_') && code.includes('rate_limit')) || e.status === 429) {
    return make({ code: 'rateLimited' });
  }
  if (NETWORK_RE.test(message)) return make({ code: 'network' });
  return make({ code: 'unknown' });
}
