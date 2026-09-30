import { queryKeys } from '@/core/query';

import { useOrderSubscription, type LiveState } from './use-order-subscription';

/** Live updates for the whole order list (and the cached details). */
export function useOrdersLive(): LiveState {
  return useOrderSubscription({}, queryKeys.orders);
}
