import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { listMyCommunities, type MyCommunity } from './service';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  communities: () => [...dashboardKeys.all, 'my-communities'] as const,
};

/** Joined communities for the dashboard stat + preview (step 16 adds the full module). */
export function useMyCommunities() {
  return useQuery({
    queryKey: dashboardKeys.communities(),
    queryFn: () => listMyCommunities(),
  } satisfies UseQueryOptions<MyCommunity[], Error>);
}
