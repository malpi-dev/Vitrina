import { queryKeys } from '@/core/query';

import { useOrderSubscription, type LiveState } from './use-order-subscription';

/** Live updates for one order. */
export function useOrderLive(orderId: string): LiveState {
  return useOrderSubscription({ orderId }, queryKeys.order(orderId));
}
