import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { useSessionMode } from '@/features/auth/presentation/hooks/use-session-mode';

export function useOrders() {
  const { orders } = useRepositories();
  const mode = useSessionMode();
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => orders.list(),
    staleTime: 30_000,
    enabled: mode === 'live' || mode === 'demo',
  });
}
