import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useCategories() {
  const { products } = useRepositories();
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => products.listCategories(),
    staleTime: 5 * 60_000,
  });
}
