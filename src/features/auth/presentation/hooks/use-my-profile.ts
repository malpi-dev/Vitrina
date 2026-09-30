import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import type { Profile } from '@/features/account/domain/profile';

import { useSessionMode } from './use-session-mode';

export function useMyProfile() {
  const { profile } = useRepositories();
  const mode = useSessionMode();
  return useQuery<Profile>({
    queryKey: queryKeys.profile,
    queryFn: () => profile.getMine(),
    enabled: mode === 'live' || mode === 'demo',
  });
}
