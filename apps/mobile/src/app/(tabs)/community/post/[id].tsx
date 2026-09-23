import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { CommentItem } from '@/features/communities/components/comment-item';
import { PostCard } from '@/features/communities/components/post-card';
import { useComments, useCommunity, useCreateComment, usePost } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { communityCommentFormSchema, type CommunityCommentFormValues } from '@kse/validation';
import type { CommunityComment } from '@kse/types';

/**
 * Post detail (spec §Posts): the full post above a one-level comment thread.
 * Comments and replies both go through the rate-limited Edge Function.
 */
export default function CommunityPostScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postQuery = usePost(id);
  const communityQuery = useCommunity(postQuery.data?.communityId ?? '');
  const commentsQuery = useComments(id);
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setViewerId(data.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (postQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <BackHeader title="Post" />
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (postQuery.isError || !postQuery.data) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Post" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load this post"
          message={(postQuery.error as Error)?.message ?? 'Post not found'}
          actionLabel="Try again"
          onAction={() => postQuery.refetch()}
        />
      </Screen>
    );
  }

  // Spec §Moderation: soft-deleted posts keep the row but blank the body
  // for everyone — including mods who are not the remover.
  if (postQuery.data.status !== 'active') {
    return (
      <Screen scroll={false}>
        <BackHeader title="Post" />
        <EmptyState
          icon="eye-off-outline"
          title="Removed by moderator"
          message="This post was removed for violating community rules. Recent comments may have been hidden too."
          actionLabel="Back"
          onAction={() => postQuery.refetch()}
        />
      </Screen>
    );
  }

  const post = postQuery.data;
  const community = communityQuery.data;
  const canModerate =
    community?.role === 'moderator' || community?.role === 'owner';
  const isMember = Boolean(community?.isMember);

  const comments = commentsQuery.data ?? [];
  const topLevel = comments.filter((c) => c.parentId === null);
  const repliesOf = (comment: CommunityComment) =>
    comments.filter((c) => c.parentId === comment.id);

  return (
    <Screen>
      <BackHeader title={community?.name ?? 'Post'} />

      <PostCard post={post} viewerId={viewerId} viewerCanModerate={canModerate} />

      <SectionHeader title={`Comments (${comments.length})`} />
      {commentsQuery.isPending && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {commentsQuery.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load comments"
          message={(commentsQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => commentsQuery.refetch()}
        />
      )}
      {commentsQuery.isSuccess && comments.length === 0 && (
        <EmptyState
          icon="chatbubbles-outline"
          title="No comments yet"
          message={post.isLocked ? 'This discussion is locked.' : 'Be the first to comment.'}
        />
      )}
      <View style={styles.thread}>
        {topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={repliesOf(comment)}
            viewerId={viewerId}
            viewerCanModerate={canModerate}
            postId={post.id}
          />
        ))}
      </View>

      {isMember ? (
        post.isLocked ? (
          <Card tint="backgroundElement" style={styles.lockedCard}>
            <View style={styles.lockedRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Comments are locked by a moderator.
              </ThemedText>
            </View>
          </Card>
        ) : (
          <CommentComposer postId={post.id} />
        )
      ) : (
        <Card tint="warning" style={styles.joinCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Join the community to join the discussion.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}

function CommentComposer({ postId }: { postId: string }) {
  const mutation = useCreateComment(postId);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommunityCommentFormValues>({
    resolver: zodResolver(communityCommentFormSchema),
    defaultValues: { content: '' },
  });

  return (
    <Card tint="background" style={styles.composerCard}>
      <ThemedText type="smallBold">Add a comment</ThemedText>
      <TextField
        control={control}
        name="content"
        label="Comment"
        placeholder="Write a comment…"
        multiline
        textAlignVertical="top"
      />
      {errors.content && (
        <ThemedText type="small" themeColor="danger">
          {errors.content.message}
        </ThemedText>
      )}
      <PrimaryButton
        label={mutation.isPending ? 'Sending…' : 'Comment'}
        loading={mutation.isPending}
        onPress={handleSubmit((values) => {
          mutation.mutate(
            { content: values.content },
            {
              onSuccess: () => reset({ content: '' }),
            },
          );
        })}
      />
      {mutation.isError && (
        <ThemedText type="small" themeColor="danger">
          {(mutation.error as Error).message}
        </ThemedText>
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
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  thread: {
    gap: Spacing.three - 4,
  },
  composerCard: {
    gap: Spacing.two,
  },
  lockedCard: {
    borderRadius: 12,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  joinCard: {
    borderRadius: 12,
  },
});
