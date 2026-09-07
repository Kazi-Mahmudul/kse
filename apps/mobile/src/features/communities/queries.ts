import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  CommunityDetail,
  CommunityListItem,
  CommunityPost,
} from '@kse/types';

import {
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunities,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunityPosts,
  listJoinedCommunityIds,
} from './service';

export const communityKeys = {
  all: ['communities'] as const,
  list: () => [...communityKeys.all, 'list'] as const,
  detail: (id: string) => [...communityKeys.all, 'detail', id] as const,
  joined: () => [...communityKeys.all, 'joined'] as const,
  posts: (id: string) => [...communityKeys.all, 'posts', id] as const,
};

export function useCommunities() {
  return useQuery({
    queryKey: communityKeys.list(),
    queryFn: fetchCommunities,
  } satisfies UseQueryOptions<CommunityListItem[], Error>);
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => getCommunity(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<CommunityDetail, Error>);
}

export function useCommunityPosts(id: string) {
  return useQuery({
    queryKey: communityKeys.posts(id),
    queryFn: () => listCommunityPosts(id),
    enabled: Boolean(id),
  } satisfies UseQueryOptions<CommunityPost[], Error>);
}

/** Ids the current user has joined — Join/Leave toggle state. */
export function useJoinedCommunityIds() {
  return useQuery({
    queryKey: communityKeys.joined(),
    queryFn: listJoinedCommunityIds,
  } satisfies UseQueryOptions<string[], Error>);
}

/** Mutations shared by the discovery list and the detail screen. */
function useCommunityMutation(mutationFn: (id: string) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.list() });
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: communityKeys.joined() });
    },
  });
}

export function useJoinCommunity() {
  return useCommunityMutation(joinCommunity);
}

export function useLeaveCommunity() {
  return useCommunityMutation(leaveCommunity);
}

export function useCreateCommunityPost(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { content: string; is_announcement: boolean }
  >({
    mutationFn: (input) =>
      createCommunityPost({
        community_id: communityId,
        content: input.content,
        is_announcement: input.is_announcement,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
    },
  });
}

export function useDeleteCommunityPost(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (postId) => deleteCommunityPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.posts(communityId) });
    },
  });
}
