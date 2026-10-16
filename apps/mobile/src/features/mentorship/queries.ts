import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  addDiscussionComment,
  bookMentorSession,
  createMentorDiscussion,
  deleteMentorDiscussion,
  fetchDiscussionComments,
  fetchMentorDiscussions,
  fetchMentorInstitutions,
  fetchMentorMessages,
  fetchMentorPortalSessions,
  fetchMentors,
  fetchMyConversations,
  fetchMyMentorApplication,
  fetchMyMentorQuestions,
  fetchMySessions,
  getMentorDetail,
  sendMentorMessage,
  submitMentorApplication,
  submitMentorQuestion,
  toggleDiscussionLike,
  updateMentorDiscussion,
  updateMentorProfile,
  updateMentorSessionStatus,
} from './service';
import type {
  BookSessionPayload,
  CreateDiscussionPayload,
  MentorConversationSummary,
  MentorDetail,
  MentorDiscussion,
  MentorDiscussionComment,
  MentorFilters,
  MentorMessage,
  MentorQuestion,
  MentorSession,
  MentorSummary,
  SubmitMentorApplicationPayload,
  SubmitQuestionPayload,
  UpdateDiscussionPayload,
  UpdateMentorProfilePayload,
} from './types';

export const mentorKeys = {
  all: ['mentors'] as const,
  list: (filters: MentorFilters) => [...mentorKeys.all, 'list', filters] as const,
  detail: (id: string) => [...mentorKeys.all, 'detail', id] as const,
  institutions: () => [...mentorKeys.all, 'institutions'] as const,
  sessions: (tab: 'upcoming' | 'past') => [...mentorKeys.all, 'sessions', tab] as const,
  messages: (opportunityId: string) => [...mentorKeys.all, 'messages', opportunityId] as const,
  conversations: () => [...mentorKeys.all, 'conversations'] as const,
  questions: () => [...mentorKeys.all, 'questions'] as const,
  discussions: () => [...mentorKeys.all, 'discussions'] as const,
  discussionComments: (id: string) => [...mentorKeys.all, 'discussion-comments', id] as const,
  myApplication: () => [...mentorKeys.all, 'my-application'] as const,
  portalSessions: () => [...mentorKeys.all, 'portal-sessions'] as const,
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

export function useMyConversations() {
  return useQuery({
    queryKey: mentorKeys.conversations(),
    queryFn: fetchMyConversations,
    staleTime: 15_000,
    refetchInterval: 15_000,
  } satisfies UseQueryOptions<MentorConversationSummary[], Error>);
}

export function useSendMentorMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      opportunityId,
      content,
      attachmentUrl,
      attachmentType,
    }: {
      opportunityId: string;
      content: string;
      attachmentUrl?: string | null;
      attachmentType?: string | null;
    }) => sendMentorMessage(opportunityId, content, attachmentUrl, attachmentType),
    onSuccess: (newMsg) => {
      queryClient.setQueryData<MentorMessage[]>(
        mentorKeys.messages(newMsg.opportunity_id),
        (old) => [...(old ?? []), newMsg],
      );
      queryClient.invalidateQueries({ queryKey: mentorKeys.conversations() });
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

// Screen 10: Mentor Community — Discussions
export function useMentorDiscussions() {
  return useQuery({
    queryKey: mentorKeys.discussions(),
    queryFn: fetchMentorDiscussions,
    staleTime: 60_000,
  } satisfies UseQueryOptions<MentorDiscussion[], Error>);
}

export function useToggleDiscussionLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ discussionId, liked }: { discussionId: string; liked: boolean }) =>
      toggleDiscussionLike(discussionId, liked),
    onMutate: async ({ discussionId, liked }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: mentorKeys.discussions() });
      const previous = queryClient.getQueryData<MentorDiscussion[]>(mentorKeys.discussions());
      queryClient.setQueryData<MentorDiscussion[]>(mentorKeys.discussions(), (old) =>
        (old ?? []).map((d) =>
          d.id === discussionId
            ? { ...d, user_liked: !liked, likes_count: d.likes_count + (liked ? -1 : 1) }
            : d,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(mentorKeys.discussions(), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.discussions() });
    },
  });
}

export function useDiscussionComments(discussionId: string) {
  return useQuery({
    queryKey: mentorKeys.discussionComments(discussionId),
    queryFn: () => fetchDiscussionComments(discussionId),
    staleTime: 30_000,
    enabled: Boolean(discussionId),
  } satisfies UseQueryOptions<MentorDiscussionComment[], Error>);
}

export function useAddDiscussionComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ discussionId, content }: { discussionId: string; content: string }) =>
      addDiscussionComment(discussionId, content),
    onSuccess: (_, { discussionId }) => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.discussionComments(discussionId) });
      queryClient.invalidateQueries({ queryKey: mentorKeys.discussions() });
    },
  });
}

// Mentor Application — Become a Mentor
export function useMyMentorApplication() {
  return useQuery({
    queryKey: mentorKeys.myApplication(),
    queryFn: fetchMyMentorApplication,
    staleTime: 60_000,
  });
}

export function useSubmitMentorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitMentorApplicationPayload) => submitMentorApplication(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.myApplication() });
    },
  });
}

// Mentor Portal: sessions booked for this mentor
export function useMentorPortalSessions() {
  return useQuery({
    queryKey: mentorKeys.portalSessions(),
    queryFn: fetchMentorPortalSessions,
    staleTime: 30_000,
  });
}

// Update Mentor Profile & Photos
export function useUpdateMentorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMentorProfilePayload) => updateMentorProfile(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.all });
      queryClient.invalidateQueries({ queryKey: mentorKeys.detail(variables.opportunity_id) });
      queryClient.invalidateQueries({ queryKey: mentorKeys.myApplication() });
    },
  });
}

// Discussions CRUD
export function useCreateMentorDiscussion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDiscussionPayload) => createMentorDiscussion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.discussions() });
    },
  });
}

export function useUpdateMentorDiscussion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDiscussionPayload) => updateMentorDiscussion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.discussions() });
    },
  });
}

export function useDeleteMentorDiscussion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (discussionId: string) => deleteMentorDiscussion(discussionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.discussions() });
    },
  });
}

// Mentor Session status update (accept / complete / cancel)
export function useUpdateMentorSessionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      status,
    }: {
      sessionId: string;
      status: 'confirmed' | 'rejected' | 'completed' | 'cancelled';
    }) => updateMentorSessionStatus(sessionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorKeys.portalSessions() });
    },
  });
}

