import { toDomainError, type DomainErrorInfo } from './domain-error';

export interface ErrorPresentation {
  title: string;
  message: string;
}

function present(info: DomainErrorInfo): ErrorPresentation {
  switch (info.code) {
    case 'network':
      return {
        title: "You're offline",
        message: "Couldn't reach the server. Check your connection and try again.",
      };
    case 'unauthorized':
      return { title: 'Session expired', message: 'Please sign in again.' };
    case 'invalidCode':
      return { title: 'Invalid code', message: 'The code is invalid or has expired.' };
    case 'rateLimited':
      return { title: 'Too many attempts', message: 'Please wait a minute and try again.' };
    case 'notFound':
      return { title: 'Not available', message: `This ${info.entity} is no longer available.` };
    case 'validation':
      return { title: 'Check your details', message: 'Some fields are not valid.' };
    case 'outOfStock':
      return { title: 'Out of stock', message: "Some items don't have enough stock." };
    case 'productUnavailable':
      return { title: 'Unavailable', message: 'Some items are no longer available.' };
    case 'paymentCanceled':
      return { title: 'Payment canceled', message: 'Payment canceled — your cart is intact.' };
    case 'paymentFailed':
      return { title: 'Payment failed', message: info.reason };
    case 'conflict':
      return { title: 'Something changed', message: 'Please refresh and try again.' };
    default:
      return { title: 'Something went wrong', message: 'Please try again.' };
  }
}

export function getErrorPresentation(error: unknown): ErrorPresentation {
  return present(toDomainError(error).info);
}
