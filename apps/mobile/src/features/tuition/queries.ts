import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { Subject, TutorListItem, TuitionRequestRow } from '@kse/types';
import type { TuitionRequestInput } from '@kse/validation';

import {
  createTuitionRequest,
  fetchTutors,
  getTutor,
  listMyTuitionRequests,
  listSubjects,
  type TutorFilters,
} from './service';

export const tuitionKeys = {
  all: ['tuition'] as const,
  tutors: (filters: TutorFilters) =>
    [...tuitionKeys.all, 'tutors', filters.q || null, filters.subjectId ?? null] as const,
  tutor: (id: string) => [...tuitionKeys.all, 'tutor', id] as const,
  subjects: () => [...tuitionKeys.all, 'subjects'] as const,
  myRequests: () => [...tuitionKeys.all, 'myRequests'] as const,
};

/** Paginated tutor feed for the discovery screen (step 15). */
export function useTutorFeed(filters: TutorFilters) {
  return useInfiniteQuery({
    queryKey: tuitionKeys.tutors(filters),
    queryFn: ({ pageParam }) => fetchTutors(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useTutor(id: string) {
  return useQuery({
    queryKey: tuitionKeys.tutor(id),
    queryFn: () => getTutor(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<TutorListItem, Error>);
}

/** Subjects for the filter chips (public reference data). */
export function useSubjects() {
  return useQuery({
    queryKey: tuitionKeys.subjects(),
    queryFn: listSubjects,
  } satisfies UseQueryOptions<Subject[], Error>);
}

export function useMyTuitionRequests() {
  return useQuery({
    queryKey: tuitionKeys.myRequests(),
    queryFn: listMyTuitionRequests,
  } satisfies UseQueryOptions<TuitionRequestRow[], Error>);
}

export function useCreateTuitionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TuitionRequestInput) => createTuitionRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tuitionKeys.myRequests() });
    },
  });
}
