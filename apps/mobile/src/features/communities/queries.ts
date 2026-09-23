import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityDetail,
  CommunityEvent,
  CommunityEventRsvp,
  CommunityListItem,
  CommunityPost,
  CommunityRecentPost,
  CommunityRequest,
} from '@kse/types';

import {
  createComment,
  createCommunityRequest,
  createEvent,
  createPost,
  fetchActiveCommunities,
  fetchCommunities,
  fetchJoinedCommunities,
  fetchRecommendedCommunities,
  fetchTrendingPosts,
  fetchUpcomingEvents,
  getCommunity,
  getPost,
  joinCommunity,
  leaveCommunity,
  listCategories,
  listComments,
  listCommunityEvents,
  listCommunityPosts,
  listMyRequests,
  reportContent,
  setEventRsvp,
  setPostLocked,
  setPostPinned,
  softDeleteComment,
  softDeletePost,
  toggleReaction,
  votePoll,
  type CommunityListFilters,
  type CreateEventInput,
  type CreatePostInput,
  type CreateRequestInput,
  type ReportableType,
} from './service';

export const communityKeys = {
  all: ['communities'] as const,
  categories: () => [...communityKeys.all, 'categories'] as const,
  list: (filters: CommunityListFilters) => [...communityKeys.all, 'list', filters] as const,
  joined: () => [...communityKeys.all, 'joined'] as const,
  recommended: () => [...communityKeys.all, 'recommended'] as const,
  active: () => [...communityKeys.all, 'active'] as const,
  trending: () => [...communityKeys.all, 'trending'] as const,
  upcomingEvents: () => [...communityKeys.all, 'upcoming-events'] as const,
  detail: (id: string) => [...communityKeys.all, 'detail', id] as const,
  posts: (id: string) => [...communityKeys.all, 'posts', id] as const,
  post: (id: string) => [...communityKeys.all, 'post', id] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  events: (id: string) => [...communityKeys.all, 'events', id] as const,
  myRequests: () => [...communityKeys.all, 'my-requests'] as const,
};

// ── Discovery ────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: communityKeys.categories(),
    queryFn: listCategories,
    staleTime: 10 * 60_000,
  } satisfies UseQueryOptions<CommunityCategory[], Error>);
}

export function useCommunitySearch(filters: CommunityListFilters) {
  return useInfiniteQuery({
    queryKey: communityKeys.list(filters),
    queryFn: ({ pageParam }) => fetchCommunities(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useJoinedCommunities(enabled = true) {
  return useQuery({
    queryKey: communityKeys.joined(),
    queryFn: fetchJoinedCommunities,
    enabled,
  } satisfies UseQueryOptions<CommunityListItem[], Error>);
}

export function useRecommendedCommunities(limit = 6) {
  return useQuery({
    queryKey: [...communityKeys.recommended(), limit],
    queryFn: () => fetchRecommendedCommunities(limit),
  } satisfies UseQueryOptions<CommunityListItem[], Error>);
}

export function useActiveCommunities(limit = 6) {
  return useQuery({
    queryKey: [...communityKeys.active(), limit],
    queryFn: () => fetchActiveCommunities(limit),
  } satisfies UseQueryOptions<CommunityListItem[], Error>);
}

export function useTrendingPosts(limit = 5) {
  return useQuery({
    queryKey: [...communityKeys.trending(), limit],
    queryFn: () => fetchTrendingPosts(limit),
  } satisfies UseQueryOptions<CommunityRecentPost[], Error>);
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: [...communityKeys.upcomingEvents(), limit],
    queryFn: () => fetchUpcomingEvents(limit),
  } satisfies UseQueryOptions<CommunityEvent[], Error>);
}

export function useMyRequests() {
  return useQuery({
    queryKey: communityKeys.myRequests(),
    queryFn: listMyRequests,
  } satisfies UseQueryOptions<CommunityRequest[], Error>);
}

// ── Community detail ─────────────────────────────────────────────────────────

export function useCommunity(id: string) {
  return useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => getCommunity(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<CommunityDetail, Error>);
}

export function useCommunityPosts(id: string) {
  return useInfiniteQuery({
    queryKey: communityKeys.posts(id),
    queryFn: ({ pageParam }) => listCommunityPosts(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: Boolean(id),
  });
}

export function useCommunityEvents(id: string) {
  return useInfiniteQuery({
    queryKey: communityKeys.events(id),
    queryFn: ({ pageParam }) => listCommunityEvents(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: Boolean(id),
  });
}

// ── Post detail ──────────────────────────────────────────────────────────────

export function usePost(id: string) {
  return useQuery({
    queryKey: communityKeys.post(id),
    queryFn: () => getPost(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<CommunityPost, Error>);
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => listComments(postId),
    enabled: Boolean(postId),
  } satisfies UseQueryOptions<CommunityComment[], Error>);
}

// ── Mutations ────────────────────────────────────────────────────────────────

function useCommunityMutation(mutationFn: (id: string) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.list({}) });
      queryClient.invalidateQueries({ queryKey: ['communities', 'list'] });
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: communityKeys.joined() });
      queryClient.invalidateQueries({ queryKey: communityKeys.recommended() });
    },
  });
}

export function useJoinCommunity() {
  return useCommunityMutation(joinCommunity);
}

export function useLeaveCommunity() {
  return useCommunityMutation(leaveCommunity);
}

export function useCreatePost(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreatePostInput>({
    mutationFn: (input) => createPost(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.trending() });
    },
  });
}

interface ReactionSnapshot {
  key: readonly unknown[];
  data: unknown;
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { post: CommunityPost; communityId?: string },
    { snapshots: ReactionSnapshot[] }
  >({
    mutationFn: ({ post }) => toggleReaction(post.id, post.viewerReacted),
    onMutate: async ({ post, communityId }) => {
      // Optimistic like/unlike on whichever cache holds the post.
      const keys = [
        ...(communityId ? [communityKeys.posts(communityId)] : []),
        communityKeys.post(post.id),
      ];
      const snapshots = keys.map((key) => ({
        key,
        data: queryClient.getQueryData(key),
      }));

      const flip = (p: CommunityPost): CommunityPost => ({
        ...p,
        viewerReacted: !p.viewerReacted,
        reactionCount: p.reactionCount + (p.viewerReacted ? -1 : 1),
      });
      for (const { key, data } of snapshots) {
        if (!data) continue;
        if (Array.isArray((data as { pages?: unknown[] }).pages)) {
          queryClient.setQueryData(key, {
            ...(data as object),
            pages: (data as { pages: CommunityPost[][] }).pages.map((page) =>
              page.map((p) => (p.id === post.id ? flip(p) : p)),
            ),
          });
        } else if ((data as CommunityPost).id === post.id) {
          queryClient.setQueryData(key, flip(data as CommunityPost));
        }
      }
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      for (const { key, data } of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { pollId: string; optionId: string; postId: string }>({
    mutationFn: ({ pollId, optionId }) => votePoll(pollId, optionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.post(variables.postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useModeratePost(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    | { kind: 'pin'; post: CommunityPost }
    | { kind: 'lock'; post: CommunityPost; locked: boolean }
    | { kind: 'delete'; post: CommunityPost }
  >({
    mutationFn: async (input) => {
      if (input.kind === 'pin') {
        await setPostPinned({
          communityId: input.post.communityId,
          postId: input.post.id,
          isPinned: !input.post.isPinned,
        });
      } else if (input.kind === 'lock') {
        await setPostLocked(input.post.id, input.locked);
      } else {
        await softDeletePost(input.post.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(communityId) });
    },
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { content: string; parentId?: string | null }>({
    mutationFn: (input) =>
      createComment({ postId, parentId: input.parentId ?? null, content: input.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (commentId) => softDeleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(postId) });
    },
  });
}

export function useSetEventRsvp() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { eventId: string; rsvp: CommunityEventRsvp | null }>({
    mutationFn: ({ eventId, rsvp }) => setEventRsvp(eventId, rsvp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.upcomingEvents() });
      queryClient.invalidateQueries({ queryKey: ['communities', 'events'] });
    },
  });
}

export function useCreateEvent(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreateEventInput>({
    mutationFn: (input) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.events(communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.upcomingEvents() });
    },
  });
}

export function useReport() {
  return useMutation<void, Error, Parameters<typeof reportContent>[0]>({
    mutationFn: reportContent,
  });
}

export function useCreateCommunityRequest() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CreateRequestInput>({
    mutationFn: (input) => createCommunityRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.myRequests() });
    },
  });
}

export type { ReportableType };
