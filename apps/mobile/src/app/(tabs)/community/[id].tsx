import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  useCommunity,
  useCommunityPosts,
  useCreateCommunityPost,
  useDeleteCommunityPost,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import {
  communityPostFormSchema,
  type CommunityPostFormValues,
} from '@kse/validation';
import type { CommunityPost } from '@kse/types';

/** Community detail (step 16): posts feed + join toggle + post composer. */
export default function CommunityDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityQuery = useCommunity(id);
  const postsQuery = useCommunityPosts(id);
  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();
  const deletePostMutation = useDeleteCommunityPost(id);
  const [viewerId, setViewerId] = useState<string | null>(null);

  // Lightweight viewer id — auth.getUser is also called by service.ts internals,
  // but the post-card "delete" gate needs the id without re-querying RLS.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setViewerId(data.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (communityQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Community" />
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (communityQuery.isError || !communityQuery.data) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Community" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this community"
          message={(communityQuery.error as Error)?.message ?? 'Community not found'}
          actionLabel="Try again"
          onAction={() => communityQuery.refetch()}
        />
      </Screen>
    );
  }

  const community = communityQuery.data;
  const posts = postsQuery.data ?? [];
  const canAnnounce = community.role === 'moderator' || community.role === 'owner';
  const isMember = community.isMember;
  const toggleMembership = () => {
    if (joinMutation.isPending || leaveMutation.isPending) return;
    if (isMember) {
      leaveMutation.mutate(community.id, {
        onSuccess: () => communityQuery.refetch(),
      });
    } else {
      joinMutation.mutate(community.id, {
        onSuccess: () => communityQuery.refetch(),
      });
    }
  };

  return (
    <Screen>
      <BackHeader title="Community" />

      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <ThemedText type="subtitle">{community.name}</ThemedText>
          {isMember && <Badge label="Joined" tone="success" />}
        </View>
        {community.universityName && (
          <ThemedText type="small" themeColor="textSecondary">
            {community.universityName}
          </ThemedText>
        )}
        {community.description && (
          <ThemedText type="small" themeColor="textSecondary">
            {community.description}
          </ThemedText>
        )}
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {community.memberCount}{' '}
              {community.memberCount === 1 ? 'member' : 'members'}
            </ThemedText>
          </View>
          <PrimaryButton
            label={
              joinMutation.isPending || leaveMutation.isPending
                ? 'Saving…'
                : isMember
                  ? 'Leave'
                  : 'Join community'
            }
            variant={isMember ? 'outline' : 'primary'}
            onPress={toggleMembership}
            disabled={joinMutation.isPending || leaveMutation.isPending}
          />
        </View>
      </View>

      <SectionHeader title="Posts" />
      {postsQuery.isPending && (
        <ActivityIndicator size="small" color={colors.primary} />
      )}
      {postsQuery.isError && (
        <Card tint="danger">
          <ThemedText type="small">{(postsQuery.error as Error).message}</ThemedText>
        </Card>
      )}
      {postsQuery.isSuccess && posts.length === 0 && (
        <Card tint="backgroundElement">
          <ThemedText type="small" themeColor="textSecondary">
            No posts yet. Be the first to start a conversation.
          </ThemedText>
        </Card>
      )}

      {posts.length > 0 && (
        <View style={styles.list}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={Boolean(viewerId && post.authorId === viewerId)}
              onDelete={() => deletePostMutation.mutate(post.id)}
            />
          ))}
        </View>
      )}

      {isMember ? (
        <Card tint="backgroundElement">
          <PostComposer
            communityId={community.id}
            canAnnounce={canAnnounce}
            onSent={() => postsQuery.refetch()}
          />
        </Card>
      ) : (
        <Card tint="warning">
          <ThemedText type="small">
            Join this community to post messages and announcements.
          </ThemedText>
          <PrimaryButton
            label="Join community"
            onPress={toggleMembership}
            style={styles.joinButton}
          />
        </Card>
      )}
    </Screen>
  );
}

function PostComposer({
  communityId,
  canAnnounce,
  onSent,
}: {
  communityId: string;
  canAnnounce: boolean;
  onSent: () => void;
}) {
  const mutation = useCreateCommunityPost(communityId);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const { control, handleSubmit, reset } = useForm<CommunityPostFormValues>({
    resolver: zodResolver(communityPostFormSchema),
    defaultValues: { content: '', is_announcement: false },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { content: values.content, is_announcement: isAnnouncement },
      {
        onSuccess: () => {
          reset({ content: '', is_announcement: false });
          setIsAnnouncement(false);
          onSent();
        },
      },
    );
  });

  return (
    <View style={styles.composer}>
      <ThemedText type="smallBold">Write a post</ThemedText>
      <TextField
        control={control}
        name="content"
        label="Message"
        placeholder="Share something with the community…"
        multiline
        textAlignVertical="top"
      />
      <View style={styles.composerActions}>
        {canAnnounce && (
          <Chip
            label="Announcement"
            selected={isAnnouncement}
            onPress={() => setIsAnnouncement((value) => !value)}
          />
        )}
        <PrimaryButton
          label={mutation.isPending ? 'Posting…' : 'Post'}
          loading={mutation.isPending}
          onPress={onSubmit}
          style={styles.postButton}
        />
      </View>
      {mutation.isError && (
        <ThemedText type="small" themeColor="danger">
          {(mutation.error as Error).message}
        </ThemedText>
      )}
    </View>
  );
}

function PostCard({
  post,
  canDelete,
  onDelete,
}: {
  post: CommunityPost;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <Card
      style={styles.postCard}
      tint={post.isAnnouncement ? 'warning' : 'backgroundElement'}
    >
      <View style={styles.postHeader}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {post.authorName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(post.createdAt)}
        </ThemedText>
      </View>
      {post.isAnnouncement && <Badge label="Announcement" tone="warning" />}
      <ThemedText type="small">{post.content}</ThemedText>
      {canDelete && (
        <PrimaryButton
          label="Delete"
          variant="outline"
          onPress={onDelete}
          style={styles.deleteButton}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  heading: {
    gap: Spacing.one + 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two + 2,
  },
  postCard: {
    gap: Spacing.two,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  deleteButton: {
    alignSelf: 'flex-start',
  },
  composer: {
    gap: Spacing.two,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  postButton: {
    flexShrink: 0,
  },
  joinButton: {
    marginTop: Spacing.two,
  },
});
