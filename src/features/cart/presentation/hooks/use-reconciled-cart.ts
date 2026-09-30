import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useRepositories } from '@/core/di';
import { toDomainError } from '@/core/errors';
import { queryKeys } from '@/core/query';

import { reconcileCart, type CartNotice } from '../../domain/reconcile-cart';
import { useCartItems, useCartStore } from '../cart.store';

export type ReconcileStatus = 'checking' | 'ok' | 'offline';

/**
 * Compares the local cart with the current catalog whenever the Cart tab opens or regains focus.
 * The query key depends on the product ids only, so changing quantities never refetches.
 */
export function useReconciledCart() {
  const { products } = useRepositories();
  const items = useCartItems();
  const replaceItems = useCartStore((s) => s.replaceItems);
  const [notices, setNotices] = useState<CartNotice[]>([]);

  const ids = items.map((i) => i.productId);
  const query = useQuery({
    queryKey: queryKeys.productsByIds(ids),
    queryFn: async () => {
      const fresh = await products.getByIds(ids);
      // Reconcile against the cart as it is now (not as it was when the request started).
      const current = useCartStore.getState().items;
      const result = reconcileCart(current, fresh);
      if (result.items !== current) replaceItems(result.items);
      if (result.notices.length > 0) setNotices((prev) => [...prev, ...result.notices]);
      return fresh;
    },
    enabled: ids.length > 0,
    staleTime: 0,
  });
  const { refetch, isFetching, isError, error } = query;
  const hasItems = ids.length > 0;

  // Re-check when the tab regains focus (`cancelRefetch: false` joins a request already in flight).
  useFocusEffect(
    useCallback(() => {
      if (hasItems) void refetch({ cancelRefetch: false });
    }, [hasItems, refetch]),
  );

  const dismissNotice = useCallback(
    (index: number) => setNotices((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const offline = isError && toDomainError(error).code === 'network';
  const status: ReconcileStatus = hasItems && isFetching ? 'checking' : offline ? 'offline' : 'ok';

  return { items, notices, status, dismissNotice };
}
