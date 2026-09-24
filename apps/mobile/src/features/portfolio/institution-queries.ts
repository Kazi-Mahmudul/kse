import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { EducationInstitutionType } from '@kse/types';

import {
  listInstitutions,
  submitInstitutionRequest,
  type SubmitInstitutionRequestInput,
} from './institutions';

export const institutionKeys = {
  all: ['education-institutions'] as const,
  list: (filters: {
    types?: readonly EducationInstitutionType[];
    city?: string | null;
    search?: string;
  }) => [...institutionKeys.all, 'list', filters] as const,
};

interface ListFilters {
  types?: readonly EducationInstitutionType[];
  city?: string | null;
  search?: string;
}

/**
 * Paginated, debounced-backed (debounce lives in the picker component) list
 * of active institutions narrowed by `types` and `city`, optionally
 * substring-searched on name. Pages accumulate so the picker can show
 * "Load more".
 */
export function useInstitutionsInfinite(filters: ListFilters) {
  return useInfiniteQuery({
    queryKey: institutionKeys.list({
      types: filters.types,
      city: filters.city ?? null,
      search: filters.search ?? '',
    }),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listInstitutions({
        types: filters.types,
        city: filters.city,
        search: filters.search,
        page: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
  });
}

/** Submit a new-institution request. The query key isn't reused for the
 *  institution list because requests don't immediately create rows — an
 *  admin has to approve first. */
export function useSubmitInstitutionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitInstitutionRequestInput) => submitInstitutionRequest(input),
    onSuccess: () => {
      // The picker doesn't read requests; we still invalidate so any future
      // "my requests" UI surfaces the new submission.
      queryClient.invalidateQueries({ queryKey: institutionKeys.all });
    },
  });
}
