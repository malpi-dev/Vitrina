import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';

export function useOrder(id: string) {
  const { orders } = useRepositories();
  const mode = useSessionMode();
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => orders.getById(id),
    staleTime: 30_000,
    enabled: mode === 'live' || mode === 'demo',
  });
}
