import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  ToletCounts,
  ToletFacet,
  ToletFilters,
  ToletListing,
  ToletListingStatus,
  ToletListingSummary,
} from '@kse/types';

import {
  fetchToletListings,
  getToletListing,
  listOwnListings,
  listToletCounts,
  listToletFacets,
  reportToletListing,
  setListingAvailability,
  submitListing,
  updateOwnListing,
  withdrawOwnListing,
} from './service';

export const toletKeys = {
  all: ['tolet'] as const,
  feed: (filters: ToletFilters) =>
    [
      ...toletKeys.all,
      'feed',
      filters.q ?? null,
      filters.city ?? null,
      filters.area ?? null,
      filters.roomType ?? null,
      filters.gender ?? null,
      filters.bachelorFriendly ?? null,
      filters.listingStatus ?? null,
      filters.minRent ?? null,
      filters.maxRent ?? null,
      filters.maxTotalRooms ?? null,
      filters.sort ?? 'recent',
    ] as const,
  detail: (id: string) => [...toletKeys.all, 'detail', id] as const,
  facets: () => [...toletKeys.all, 'facets'] as const,
  counts: () => [...toletKeys.all, 'counts'] as const,
  own: () => [...toletKeys.all, 'own'] as const,
};

/**
 * Infinite-scroll Bachelor To-Let feed (mirrors `useOpportunityFeed`'s
 * dedup-select fix — see `queries.ts` in opportunities feature for context).
 */
export function useToletFeed(filters: ToletFilters) {
  return useInfiniteQuery({
    queryKey: toletKeys.feed(filters),
    queryFn: ({ pageParam }) => fetchToletListings(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    select: (data) => {
      const seen = new Set<string>();
      const dedupedReversed = [...data.pages]
        .reverse()
        .map((page) => ({
          ...page,
          rows: page.rows.filter((row) => {
            if (seen.has(row.id)) return false;
            seen.add(row.id);
            return true;
          }),
        }));
      return { ...data, pages: dedupedReversed.reverse() };
    },
  });
}

export function useToletListing(id: string) {
  return useQuery({
    queryKey: toletKeys.detail(id),
    queryFn: () => getToletListing(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<ToletListing, Error>);
}

export function useToletFacets() {
  return useQuery({
    queryKey: toletKeys.facets(),
    queryFn: () => listToletFacets(),
    staleTime: 60_000,
  } satisfies UseQueryOptions<ToletFacet, Error>);
}

export function useToletCounts() {
  return useQuery({
    queryKey: toletKeys.counts(),
    queryFn: () => listToletCounts(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  } satisfies UseQueryOptions<ToletCounts, Error>);
}

export function useOwnListings() {
  return useQuery({
    queryKey: toletKeys.own(),
    queryFn: () => listOwnListings(),
  } satisfies UseQueryOptions<ToletListingSummary[], Error>);
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useSubmitListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => submitListing(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toletKeys.all });
    },
  });
}

export function useUpdateOwnListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      payload,
    }: {
      listingId: string;
      payload: Record<string, unknown>;
    }) => updateOwnListing(listingId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toletKeys.all });
    },
  });
}

export function useWithdrawOwnListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => withdrawOwnListing(listingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toletKeys.all });
    },
  });
}

export function useSetListingAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      status,
    }: {
      listingId: string;
      status: ToletListingStatus;
    }) => setListingAvailability(listingId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toletKeys.all });
    },
  });
}

export function useReportToletListing() {
  return useMutation({
    mutationFn: ({
      listingId,
      reason,
      details,
    }: {
      listingId: string;
      reason: string;
      details?: string;
    }) => reportToletListing(listingId, reason, details),
  });
}

// ── Aliases (semantic names used by screens) ────────────────────────────────
// The screen code prefers `useMyToletListings` over `useOwnListings`; both
// resolve to the same query. Keep them in sync.
export const useMyToletListings = useOwnListings;
export const useWithdrawToletListing = useWithdrawOwnListing;
