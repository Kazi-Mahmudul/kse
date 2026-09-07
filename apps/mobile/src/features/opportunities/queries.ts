import { useInfiniteQuery, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { OpportunitySummary, OpportunityType } from '@kse/types';

import {
  getOpportunity,
  listLatestOpportunities,
  listOpportunities,
  type OpportunityDetail,
} from './service';

export const opportunityKeys = {
  all: ['opportunities'] as const,
  list: (type: OpportunityType) => [...opportunityKeys.all, 'list', type] as const,
  latest: (limit: number) => [...opportunityKeys.all, 'latest', limit] as const,
  detail: (id: string) => [...opportunityKeys.all, 'detail', id] as const,
};

/** Paginated listing for a type screen, with a load-more cursor. */
export function useOpportunities(type: OpportunityType) {
  return useInfiniteQuery({
    queryKey: opportunityKeys.list(type),
    queryFn: ({ pageParam }) => listOpportunities({ type, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

export function useLatestOpportunities(limit = 4) {
  return useQuery({
    queryKey: opportunityKeys.latest(limit),
    queryFn: () => listLatestOpportunities(limit),
  } satisfies UseQueryOptions<OpportunitySummary[], Error>);
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => getOpportunity(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<OpportunityDetail, Error>);
}
