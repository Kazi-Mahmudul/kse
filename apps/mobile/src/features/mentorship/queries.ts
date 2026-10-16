import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  bookMentorSession,
  fetchMentorDiscussions,
  fetchMentorInstitutions,
  fetchMentorMessages,
  fetchMentors,
  fetchMySessions,
  fetchMyMentorQuestions,
  getMentorDetail,
  sendMentorMessage,
  submitMentorQuestion,
} from './service';
import type {
  BookSessionPayload,
  MentorDetail,
  MentorDiscussion,
  MentorFilters,
  MentorMessage,
  MentorQuestion,
  MentorSession,
  MentorSummary,
  SubmitQuestionPayload,
} from './types';

export const mentorKeys = {
  all: ['mentors'] as const,
  list: (filters: MentorFilters) => [...mentorKeys.all, 'list', filters] as const,
  detail: (id: string) => [...mentorKeys.all, 'detail', id] as const,
  institutions: () => [...mentorKeys.all, 'institutions'] as const,
  sessions: (tab: 'upcoming' | 'past') => [...mentorKeys.all, 'sessions', tab] as const,
  messages: (opportunityId: string) => [...mentorKeys.all, 'messages', opportunityId] as const,
  questions: () => [...mentorKeys.all, 'questions'] as const,
  discussions: () => [...mentorKeys.all, 'discussions'] as const,
};

export function useMentors(filters: MentorFilters = {}) {
  return useQuery({
    queryKey: mentorKeys.list(filters),
    queryFn: () => fetchMentors(filters),
    staleTime: 60_000,
  } satisfies UseQueryOptions<MentorSummary[], Error>);
}

export function useMentor(id: string | undefined) {
  return useQuery({
    queryKey: mentorKeys.detail(id ?? ''),
    queryFn: () => getMentorDetail(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  } satisfies UseQueryOptions<MentorDetail, Error>);
}

export function useMentorInstitutions() {
  return useQuery({
    queryKey: mentorKeys.institutions(),
    queryFn: fetchMentorInstitutions,
    staleTime: 300_000,
  });
}

export function useBookMentorSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BookSessionPayload) => bookMentorSession(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.detail(variables.opportunity_id) });
      queryClient.invalidateQueries({ queryKey: mentorKeys.sessions('upcoming') });
    },
  });
}

// Screen 8: My Sessions
export function useMySessions(tab: 'upcoming' | 'past') {
  return useQuery({
    queryKey: mentorKeys.sessions(tab),
    queryFn: () => fetchMySessions(tab),
    staleTime: 30_000,
  } satisfies UseQueryOptions<MentorSession[], Error>);
}

// Screen 7: Chat
export function useMentorMessages(opportunityId: string | undefined) {
  return useQuery({
    queryKey: mentorKeys.messages(opportunityId ?? ''),
    queryFn: () => fetchMentorMessages(opportunityId!),
    enabled: Boolean(opportunityId),
    staleTime: 0,
    refetchInterval: 10_000,
  } satisfies UseQueryOptions<MentorMessage[], Error>);
}

export function useSendMentorMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ opportunityId, content }: { opportunityId: string; content: string }) =>
      sendMentorMessage(opportunityId, content),
    onSuccess: (newMsg) => {
      queryClient.setQueryData<MentorMessage[]>(
        mentorKeys.messages(newMsg.opportunity_id),
        (old) => [...(old ?? []), newMsg],
      );
    },
  });
}

// Screen 9: Ask a Question
export function useMyMentorQuestions() {
  return useQuery({
    queryKey: mentorKeys.questions(),
    queryFn: fetchMyMentorQuestions,
    staleTime: 30_000,
  } satisfies UseQueryOptions<MentorQuestion[], Error>);
}

export function useSubmitMentorQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitQuestionPayload) => submitMentorQuestion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.questions() });
    },
  });
}

// Screen 10: Mentor Community
export function useMentorDiscussions() {
  return useQuery({
    queryKey: mentorKeys.discussions(),
    queryFn: fetchMentorDiscussions,
    staleTime: 60_000,
  } satisfies UseQueryOptions<MentorDiscussion[], Error>);
}
