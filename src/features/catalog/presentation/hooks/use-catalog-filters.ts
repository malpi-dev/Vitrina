import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import {
  parseProductFilters,
  toProductSearchParams,
  type ProductFilters,
} from '../../domain/product-query';

const PARAM_KEYS = ['q', 'category', 'min', 'max', 'inStock', 'sort'] as const;

/** Catalog filters live in the route search params, so they survive navigation and can be deep-linked. */
export function useCatalogFilters() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const serialized = JSON.stringify(params);
  // `serialized` is the stable identity of `params`: `filters` only changes when a param does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => parseProductFilters(params), [serialized]);

  const setFilters = useCallback(
    (next: ProductFilters) => {
      const encoded = toProductSearchParams(next);
      // Every key is sent, empty ones as undefined, so stale params are removed.
      const all: Record<string, string | undefined> = {};
      for (const key of PARAM_KEYS) all[key] = encoded[key];
      router.setParams(all);
    },
    [router],
  );

  /** Clears everything, including the search text (the empty state offers "Clear filters" after a search). */
  const clearFilters = useCallback(() => setFilters({ sort: 'newest' }), [setFilters]);

  return { filters, setFilters, clearFilters };
}
