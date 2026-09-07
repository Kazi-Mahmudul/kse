import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { OpportunitySummary, OpportunityType } from '@kse/types';

import {
  fetchOpportunities,
  getOpportunity,
  listLatestOpportunities,
  listOpportunityCategories,
  type OpportunityCategoryInfo,
  type OpportunityDetail,
  type OpportunityFilters,
} from './service';

export const opportunityKeys = {
  all: ['opportunities'] as const,
  list: (filters: OpportunityFilters) =>
    [
      ...opportunityKeys.all,
      'list',
      filters.q || null,
      filters.type ?? null,
      filters.mode ?? null,
      filters.categoryId ?? null,
      filters.deadlineWithinDays ?? null,
    ] as const,
  latest: (limit: number) => [...opportunityKeys.all, 'latest', limit] as const,
  detail: (id: string) => [...opportunityKeys.all, 'detail', id] as const,
  categories: (type: OpportunityType | undefined) =>
    [...opportunityKeys.all, 'categories', type ?? null] as const,
};

/** Paginated feed shared by search and per-type listings (step 9). */
export function useOpportunityFeed(filters: OpportunityFilters) {
  return useInfiniteQuery({
    queryKey: opportunityKeys.list(filters),
    queryFn: ({ pageParam }) => fetchOpportunities(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useLatestOpportunities(limit = 4) {
  return useQuery({
    queryKey: opportunityKeys.latest(limit),
    queryFn: () => listLatestOpportunities(limit),
  } satisfies UseQueryOptions<OpportunitySummary[], Error>);
}

/** Type-scoped categories for filter chips (public read). */
export function useOpportunityCategories(type?: OpportunityType) {
  return useQuery({
    queryKey: opportunityKeys.categories(type),
    queryFn: () => listOpportunityCategories(type),
  } satisfies UseQueryOptions<OpportunityCategoryInfo[], Error>);
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => getOpportunity(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<OpportunityDetail, Error>);
}
