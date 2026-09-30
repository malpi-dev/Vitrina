import { useInfiniteQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

import type { ProductFilters } from '../../domain/product-query';

export function useProducts(filters: ProductFilters) {
  const { products } = useRepositories();
  return useInfiniteQuery({
    queryKey: queryKeys.products(filters),
    queryFn: ({ pageParam }) => products.list({ ...filters, cursor: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 5 * 60_000,
  });
}
