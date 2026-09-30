export type DomainErrorInfo =
  | { code: 'network' }
  | { code: 'unauthorized' }
  | { code: 'invalidCode' }
  | { code: 'codeExpired' } // kept for completeness; GoTrue never distinguishes it (see bitacora)
  | { code: 'rateLimited' }
  | { code: 'conflict' } // e.g. invalid order status transition
  | { code: 'notFound'; entity: 'product' | 'order' | 'profile' }
  | { code: 'validation'; fields?: Record<string, string> }
  | { code: 'outOfStock'; productIds: string[] }
  | { code: 'productUnavailable'; productIds: string[] }
  | { code: 'paymentCanceled' }
  | { code: 'paymentFailed'; reason: string }
  | { code: 'unknown' };

export type DomainErrorCode = DomainErrorInfo['code'];

export class DomainError extends Error {
  readonly info: DomainErrorInfo;
  /** Only for logs, never shown to the user. */
  override readonly cause?: unknown;

  constructor(info: DomainErrorInfo, message?: string, cause?: unknown) {
    super(message ?? info.code);
    this.name = 'DomainError';
    this.info = info;
    this.cause = cause;
  }

  get code(): DomainErrorCode {
    return this.info.code;
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;

export const toDomainError = (e: unknown): DomainError =>
  isDomainError(e)
    ? e
    : new DomainError({ code: 'unknown' }, e instanceof Error ? e.message : undefined, e);
