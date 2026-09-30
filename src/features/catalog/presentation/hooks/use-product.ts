import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useProduct(id: string) {
  const { products } = useRepositories();
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => products.getById(id),
    staleTime: 5 * 60_000,
  });
}
