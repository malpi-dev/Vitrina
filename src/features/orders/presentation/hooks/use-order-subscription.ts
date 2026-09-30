import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';

import type { Order } from '../../domain/order';

export type LiveState = 'connecting' | 'live' | 'paused';

/** Writes a fresh order into the detail cache and into the list (replace, or prepend if new). */
export function applyOrderUpdate(queryClient: QueryClient, order: Order): void {
  queryClient.setQueryData(queryKeys.order(order.id), order);
  const list = queryClient.getQueryData<Order[]>(queryKeys.orders);
  if (!list) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    return;
  }
  queryClient.setQueryData<Order[]>(
    queryKeys.orders,
    list.some((o) => o.id === order.id)
      ? list.map((o) => (o.id === order.id ? order : o))
      : [order, ...list],
  );
}

/**
 * Keeps the order caches in sync with the repository's change stream while mounted.
 * Re-runs when the repository object changes (demo <-> live). When the stream comes back after
 * being paused, `invalidateKey` is refetched so nothing that happened meanwhile is lost.
 */
export function useOrderSubscription(
  filter: { orderId?: string },
  invalidateKey: readonly unknown[],
): LiveState {
  const { orders } = useRepositories();
  const mode = useSessionMode();
  const queryClient = useQueryClient();
  const [state, setState] = useState<LiveState>('connecting');
  const { orderId } = filter;
  const keyString = JSON.stringify(invalidateKey);
  const enabled = mode === 'live' || mode === 'demo';

  useEffect(() => {
    if (!enabled) return;
    let wasPaused = false;
    const unsubscribe = orders.subscribe(
      { orderId },
      (order) => applyOrderUpdate(queryClient, order),
      (status) => {
        if (status === 'live' && wasPaused) {
          void queryClient.invalidateQueries({ queryKey: JSON.parse(keyString) as unknown[] });
        }
        wasPaused = status === 'paused';
        setState(status);
      },
    );
    return () => {
      unsubscribe();
      setState('connecting');
    };
  }, [orders, orderId, queryClient, keyString, enabled]);

  return enabled ? state : 'connecting';
}
