import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  MyTutorApplication,
  Subject,
  TutorListItem,
  TutorReview,
  TuitionRequestRow,
} from '@kse/types';
import type {
  TutorApplicationInput,
  TuitionRequestInput,
  TutorReviewInput,
} from '@kse/validation';

import {
  createTuitionRequest,
  deleteTutorReview,
  fetchTutors,
  getMyTutorApplication,
  getTutor,
  listMyTuitionRequests,
  listSavedTutorIds,
  listSubjects,
  listTutorReviews,
  saveTutor,
  submitTutorApplication,
  unsaveTutor,
  upsertTutorReview,
  type TutorFilters,
} from './service';

export type { TutorFilters, TutorSort } from './service';

export const tuitionKeys = {
  all: ['tuition'] as const,
  tutors: (filters: TutorFilters) =>
    [
      ...tuitionKeys.all,
      'tutors',
      filters.q || null,
      filters.subjectId ?? null,
      filters.sort ?? 'popular',
    ] as const,
  tutor: (id: string) => [...tuitionKeys.all, 'tutor', id] as const,
  reviews: (tutorId: string) => [...tuitionKeys.tutor(tutorId), 'reviews'] as const,
  subjects: () => [...tuitionKeys.all, 'subjects'] as const,
  myRequests: () => [...tuitionKeys.all, 'myRequests'] as const,
  savedTutors: () => [...tuitionKeys.all, 'savedTutors'] as const,
  myApplication: () => [...tuitionKeys.all, 'myApplication'] as const,
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

/** Reviews shown on the tutor profile; the aggregate lives on the tutor row. */
export function useTutorReviews(tutorId: string) {
  return useQuery({
    queryKey: tuitionKeys.reviews(tutorId),
    queryFn: () => listTutorReviews(tutorId),
    enabled: Boolean(tutorId),
  } satisfies UseQueryOptions<TutorReview[], Error>);
}

/** Optimistic bookmark toggle — the card icon flips without a refetch round-trip. */
export function useToggleSavedTutor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tutorId, saved }: { tutorId: string; saved: boolean }) =>
      saved ? unsaveTutor(tutorId) : saveTutor(tutorId),
    onMutate: async ({ tutorId, saved }) => {
      await queryClient.cancelQueries({ queryKey: tuitionKeys.savedTutors() });
      const previous = queryClient.getQueryData<string[]>(
        tuitionKeys.savedTutors(),
      );
      queryClient.setQueryData<string[]>(tuitionKeys.savedTutors(), (current) => {
        const ids = new Set(current ?? []);
        if (saved) ids.delete(tutorId);
        else ids.add(tutorId);
        return [...ids];
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tuitionKeys.savedTutors(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.savedTutors() });
    },
  });
}

/** Bookmarked tutor ids for the signed-in student. */
export function useSavedTutorIds() {
  return useQuery({
    queryKey: tuitionKeys.savedTutors(),
    queryFn: listSavedTutorIds,
  } satisfies UseQueryOptions<string[], Error>);
}

export function useUpsertTutorReview(tutorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TutorReviewInput) => upsertTutorReview(tutorId, input),
    onSuccess: () => {
      // Reviews + the tutor row's trigger-maintained aggregates both change.
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.tutor(tutorId) });
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.reviews(tutorId) });
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.all });
    },
  });
}

export function useDeleteTutorReview(tutorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => deleteTutorReview(reviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.tutor(tutorId) });
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.reviews(tutorId) });
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.all });
    },
  });
}

/** Subjects for the filter pills (public reference data). */
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

/** Latest become-a-tutor application for the signed-in student (null = none). */
export function useMyTutorApplication() {
  return useQuery({
    queryKey: tuitionKeys.myApplication(),
    queryFn: getMyTutorApplication,
  } satisfies UseQueryOptions<MyTutorApplication | null, Error>);
}

export function useSubmitTutorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TutorApplicationInput) => submitTutorApplication(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tuitionKeys.myApplication() });
    },
  });
}
