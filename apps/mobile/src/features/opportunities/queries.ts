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
  listOpportunityCountsByType,
  listOpportunityFacets,
  type OpportunityCategoryInfo,
  type OpportunityCountsByType,
  type OpportunityDetail,
  type OpportunityFacets,
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
      filters.degreeLevel ?? null,
      filters.fundingType ?? null,
      filters.country ?? null,
      filters.countryNot ?? null,
      filters.location ?? null,
      filters.organization ?? null,
      filters.internshipType ?? null,
      filters.deadlineWithinDays ?? null,
    ] as const,
  latest: (limit: number) => [...opportunityKeys.all, 'latest', limit] as const,
  detail: (id: string) => [...opportunityKeys.all, 'detail', id] as const,
  categories: (type: OpportunityType | undefined) =>
    [...opportunityKeys.all, 'categories', type ?? null] as const,
  facets: (type: OpportunityType | undefined) =>
    [...opportunityKeys.all, 'facets', type ?? null] as const,
  countsByType: () => [...opportunityKeys.all, 'counts-by-type'] as const,
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

/** Counts of published opportunities by type (dashboard "Opportunity Overview"). */
export function useOpportunityCountsByType() {
  return useQuery({
    queryKey: opportunityKeys.countsByType(),
    queryFn: listOpportunityCountsByType,
    // Catalog size doesn't change second-to-second; a minute is plenty.
    staleTime: 60_000,
  } satisfies UseQueryOptions<OpportunityCountsByType, Error>);
}

/** Type-scoped categories for filter chips (public read). */
export function useOpportunityCategories(type?: OpportunityType) {
  return useQuery({
    queryKey: opportunityKeys.categories(type),
    queryFn: () => listOpportunityCategories(type),
  } satisfies UseQueryOptions<OpportunityCategoryInfo[], Error>);
}

/** Distinct location/organization values for the facet chip rows. */
export function useOpportunityFacets(type?: OpportunityType) {
  return useQuery({
    queryKey: opportunityKeys.facets(type),
    queryFn: () => listOpportunityFacets(type),
  } satisfies UseQueryOptions<OpportunityFacets, Error>);
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => getOpportunity(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<OpportunityDetail, Error>);
}
