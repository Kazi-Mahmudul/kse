import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  BookFilters,
  BookListingDetail,
  BookListingInput,
  BookListingSummary,
  HubCategory,
  HubFacet,
  HubFilters,
  HubListingDetail,
  HubListingSubmission,
  HubExploreCounts,
  ResearchFilters,
  ResearchProfileDetail,
  ResearchRequest,
  SavedHubListing,
} from '@kse/types';

import * as svc from './service';

// ── Query keys ───────────────────────────────────────────────────────────────

export const hubKeys = {
  all: ['hub'] as const,
  categories: () => [...hubKeys.all, 'categories'] as const,
  listings: (filters: HubFilters) =>
    [
      ...hubKeys.all,
      'listings',
      filters.q ?? null,
      filters.categorySlug ?? null,
      filters.serviceType ?? null,
      filters.area ?? null,
      filters.verified ?? null,
      filters.discount ?? null,
      filters.openNow ?? null,
      filters.sort ?? 'recent',
    ] as const,
  listing: (id: string) => [...hubKeys.all, 'listing', id] as const,
  facets: (categorySlug?: string) => [...hubKeys.all, 'facets', categorySlug ?? null] as const,
  favoriteIds: () => [...hubKeys.all, 'favoriteIds'] as const,
  saved: () => [...hubKeys.all, 'saved'] as const,
  /** Explore-menu badge counts (published listings / active books / research). */
  exploreCounts: () => [...hubKeys.all, 'explore-counts'] as const,

  books: (filters: BookFilters) =>
    [...hubKeys.all, 'books', filters.q ?? null, filters.intent ?? null, filters.condition ?? null] as const,
  book: (id: string) => [...hubKeys.all, 'book', id] as const,
  myBooks: () => [...hubKeys.all, 'books', 'mine'] as const,

  research: (filters: ResearchFilters) =>
    [
      ...hubKeys.all,
      'research',
      filters.q ?? null,
      filters.discipline ?? null,
      filters.district ?? null,
      filters.collaboration ?? null,
    ] as const,
  researchProfile: (id: string) => [...hubKeys.all, 'research', 'profile', id] as const,
  myResearchProfile: () => [...hubKeys.all, 'research', 'mine'] as const,
  myResearchRequests: () => [...hubKeys.all, 'research', 'requests'] as const,
};

// ── Directory ────────────────────────────────────────────────────────────────

export function useHubCategories() {
  return useQuery({
    queryKey: hubKeys.categories(),
    queryFn: () => svc.fetchHubCategories(),
    staleTime: 300_000,
  } satisfies UseQueryOptions<HubCategory[], Error>);
}

/** Explore-menu badge counts for the Student Hub rows. */
export function useHubExploreCounts() {
  return useQuery({
    queryKey: hubKeys.exploreCounts(),
    queryFn: () => svc.fetchHubExploreCounts(),
    staleTime: 60_000,
  } satisfies UseQueryOptions<HubExploreCounts, Error>);
}

export function useHubFeed(filters: HubFilters, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: hubKeys.listings(filters),
    queryFn: ({ pageParam }) => svc.fetchHubListings(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
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

export function useHubListing(id: string) {
  return useQuery({
    queryKey: hubKeys.listing(id),
    queryFn: () => svc.getHubListing(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<HubListingDetail, Error>);
}

export function useHubFacets(categorySlug?: string) {
  return useQuery({
    queryKey: hubKeys.facets(categorySlug),
    queryFn: () => svc.listHubFacets(categorySlug),
    staleTime: 60_000,
  } satisfies UseQueryOptions<HubFacet, Error>);
}

// ── Favorites ────────────────────────────────────────────────────────────────

export function useHubFavoriteIds() {
  return useQuery({
    queryKey: hubKeys.favoriteIds(),
    queryFn: () => svc.listFavoriteIds(),
    staleTime: 60_000,
  } satisfies UseQueryOptions<Set<string>, Error>);
}

export function useToggleHubFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, save }: { listingId: string; save: boolean }) =>
      save ? svc.saveFavorite(listingId) : svc.unsaveFavorite(listingId),
    onMutate: async ({ listingId, save }) => {
      await qc.cancelQueries({ queryKey: hubKeys.favoriteIds() });
      const prev = qc.getQueryData<Set<string>>(hubKeys.favoriteIds());
      if (prev) {
        const next = new Set(prev);
        if (save) next.add(listingId);
        else next.delete(listingId);
        qc.setQueryData(hubKeys.favoriteIds(), next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(hubKeys.favoriteIds(), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.favoriteIds() });
      void qc.invalidateQueries({ queryKey: hubKeys.saved() });
    },
  });
}

export function useSavedHubListings() {
  return useQuery({
    queryKey: hubKeys.saved(),
    queryFn: () => svc.listSavedHubListings(),
  } satisfies UseQueryOptions<SavedHubListing[], Error>);
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function useReportHubTarget() {
  return useMutation({
    mutationFn: ({
      targetType,
      targetId,
      reason,
      details,
    }: {
      targetType: 'student_hub_listing' | 'book_listing' | 'research_profile';
      targetId: string;
      reason: string;
      details?: string;
    }) => svc.reportHubTarget(targetType, targetId, reason, details),
  });
}

// ── Listing submission ───────────────────────────────────────────────────────

export function useSubmitHubListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: HubListingSubmission) => svc.submitHubListing(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}

// ── Book Exchange ────────────────────────────────────────────────────────────

export function useBookFeed(filters: BookFilters, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: hubKeys.books(filters),
    queryFn: ({ pageParam }) => svc.fetchBookListings(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
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

export function useBookListing(id: string) {
  return useQuery({
    queryKey: hubKeys.book(id),
    queryFn: () => svc.getBookListing(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<BookListingDetail, Error>);
}

export function useMyBookListings() {
  return useQuery({
    queryKey: hubKeys.myBooks(),
    queryFn: () => svc.fetchMyBookListings(),
  } satisfies UseQueryOptions<BookListingSummary[], Error>);
}

export function useCreateBookListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookListingInput) => svc.createBookListing(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}

export function useUpdateBookListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BookListingInput }) =>
      svc.updateBookListing(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}

export function useSetBookListingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookListingSummary['status'] }) =>
      svc.setBookListingStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.all });
    },
  });
}

export function useContactBookOwner() {
  return useMutation({
    mutationFn: ({ bookId, message }: { bookId: string; message?: string }) =>
      svc.contactBookOwner(bookId, message),
  });
}

// ── Research partners ────────────────────────────────────────────────────────

export function useResearchFeed(filters: ResearchFilters, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: hubKeys.research(filters),
    queryFn: ({ pageParam }) => svc.fetchResearchProfiles(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useResearchProfile(id: string) {
  return useQuery({
    queryKey: hubKeys.researchProfile(id),
    queryFn: () => svc.getResearchProfile(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<ResearchProfileDetail, Error>);
}

export function useMyResearchProfile() {
  return useQuery({
    queryKey: hubKeys.myResearchProfile(),
    queryFn: () => svc.getMyResearchProfile(),
  } satisfies UseQueryOptions<ResearchProfileDetail | null, Error>);
}

export function useSaveMyResearchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof svc.saveMyResearchProfile>[0]) =>
      svc.saveMyResearchProfile(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hubKeys.all, 'research'] });
    },
  });
}

export function useMyResearchRequests() {
  return useQuery({
    queryKey: hubKeys.myResearchRequests(),
    queryFn: () => svc.fetchMyResearchRequests(),
  } satisfies UseQueryOptions<{ received: ResearchRequest[]; sent: ResearchRequest[] }, Error>);
}

export function useSendResearchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ toProfileId, message }: { toProfileId: string; message: string }) =>
      svc.sendResearchRequest(toProfileId, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.myResearchRequests() });
    },
  });
}

export function useRespondResearchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      svc.respondResearchRequest(requestId, accept),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hubKeys.myResearchRequests() });
    },
  });
}
