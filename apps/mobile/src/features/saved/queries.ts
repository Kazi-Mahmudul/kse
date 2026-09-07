import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  listSavedOpportunityIds,
  listSavedOpportunities,
  saveOpportunity,
  unsaveOpportunity,
  type SavedOpportunityRow,
} from './service';

/** Query keys for bookmark-owned data (CLAUDE.md rule 11: TanStack Query). */
export const savedKeys = {
  all: ['saved'] as const,
  ids: () => [...savedKeys.all, 'ids'] as const,
  list: () => [...savedKeys.all, 'list'] as const,
};

/** Toggle state for cards/detail — a Set kept in cache for O(1) checks. */
export function useSavedOpportunityIds() {
  return useQuery({
    queryKey: savedKeys.ids(),
    queryFn: async () => new Set(await listSavedOpportunityIds()),
  } satisfies UseQueryOptions<Set<string>, Error>);
}

/** Full saved list for the Saved screen. */
export function useSavedOpportunities() {
  return useQuery({
    queryKey: savedKeys.list(),
    queryFn: () => listSavedOpportunities(),
  } satisfies UseQueryOptions<SavedOpportunityRow[], Error>);
}

export interface ToggleSavedParams {
  opportunityId: string;
  saved: boolean;
}

/**
 * Optimistic bookmark toggle: the ids Set flips immediately and is rolled
 * back if the request fails; the Saved list refetches on settle.
 */
export function useToggleSavedOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, saved }: ToggleSavedParams) =>
      saved ? saveOpportunity(opportunityId) : unsaveOpportunity(opportunityId),

    onMutate: async ({ opportunityId, saved }) => {
      await queryClient.cancelQueries({ queryKey: savedKeys.ids() });
      const previous = queryClient.getQueryData<Set<string>>(savedKeys.ids());

      const next = new Set(previous ?? []);
      if (saved) {
        next.add(opportunityId);
      } else {
        next.delete(opportunityId);
      }
      queryClient.setQueryData(savedKeys.ids(), next);

      return { previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(savedKeys.ids(), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: savedKeys.all });
    },
  });
}
