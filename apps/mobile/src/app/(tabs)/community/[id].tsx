import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
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
import { FontFamilies, Spacing } from '@/constants/theme';
import {
  useCommunity,
  useCommunityPosts,
  useCreateCommunityPost,
  useDeleteCommunityPost,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/features/communities/queries';
import { CommunityAvatar } from '@/features/communities/components/community-avatar';
import {
  formatMemberCount,
  formatRelativeTime,
} from '@/features/communities/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { analytics } from '@/lib/analytics';
import { confirmDialog } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import {
  communityPostFormSchema,
  type CommunityPostFormValues,
} from '@kse/validation';
import type { CommunityMemberRole, CommunityPost } from '@kse/types';

/** Membership badges shown next to the community name (hero card). */
const ROLE_LABELS: Partial<Record<CommunityMemberRole, string>> = {
  moderator: 'Moderator',
  owner: 'Owner',
};

/**
 * Community detail (step 16, spec 09._community_kse visual language): brand
 * hero card (avatar + counts + join toggle), a discussion feed of post
 * cards with initials avatars, and the composer for members.
 */
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
  const togglingMembership = joinMutation.isPending || leaveMutation.isPending;
  const toggleMembership = () => {
    if (togglingMembership) return;
    if (isMember) {
      leaveMutation.mutate(community.id, {
        onSuccess: () => {
          communityQuery.refetch();
          analytics.communityJoined(community.id, false);
        },
      });
    } else {
      joinMutation.mutate(community.id, {
        onSuccess: () => {
          communityQuery.refetch();
          analytics.communityJoined(community.id, true);
        },
      });
    }
  };

  return (
    <Screen>
      <BackHeader title="Community" />

      {/* Hero — the community's brand mark, description and membership. */}
      <Card
        tint="background"
        style={[
          styles.hero,
          { borderColor: colors.border, boxShadow: `0px 4px 8px ${colors.shadow}` },
        ]}
      >
        <View style={styles.heroTop}>
          <CommunityAvatar
            slug={community.slug}
            name={community.name}
            size={56}
            radius={16}
          />
          <View style={styles.heroTitleBlock}>
            <ThemedText themeColor="heading" style={styles.heroName} numberOfLines={2}>
              {community.name}
            </ThemedText>
            {community.universityName ? (
              <View style={styles.universityRow}>
                <Ionicons
                  name="business-outline"
                  size={11}
                  color={colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={styles.university}
                >
                  {community.universityName}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {community.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
            {community.description}
          </ThemedText>
        ) : null}

        <View style={styles.heroMetaRow}>
          <View style={styles.meta}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {formatMemberCount(community.memberCount)}{' '}
              {community.memberCount === 1 ? 'member' : 'members'}
            </ThemedText>
          </View>
          <PrimaryButton
            label={togglingMembership ? 'Saving…' : isMember ? 'Leave' : 'Join'}
            variant={isMember ? 'outline' : 'primary'}
            size="compact"
            onPress={toggleMembership}
            disabled={togglingMembership}
          />
        </View>

        {isMember && community.role && ROLE_LABELS[community.role] ? (
          <View style={styles.badgeRow}>
            <Badge label="Joined" tone="success" />
            <Badge label={ROLE_LABELS[community.role] as string} tone="neutral" />
          </View>
        ) : isMember ? (
          <Badge label="Joined" tone="success" />
        ) : null}
      </Card>

      <SectionHeader title="Discussion" />
      {postsQuery.isPending && (
        <View style={styles.postsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {postsQuery.isError && (
        <Card tint="danger">
          <ThemedText type="small">{(postsQuery.error as Error).message}</ThemedText>
        </Card>
      )}
      {postsQuery.isSuccess && posts.length === 0 && (
        <EmptyState
          icon="chatbubbles-outline"
          title="No posts yet"
          message="Be the first to start a conversation."
        />
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
        <Card
          tint="background"
          style={[
            styles.composerCard,
            { borderColor: colors.border, boxShadow: `0px 1px 6px ${colors.shadow}` },
          ]}
        >
          <PostComposer
            communityId={community.id}
            canAnnounce={canAnnounce}
            onSent={() => postsQuery.refetch()}
          />
        </Card>
      ) : (
        <Card tint="warning" style={styles.joinCta}>
          <View style={styles.joinCtaRow}>
            <View style={styles.joinCtaBadge}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.warning} />
            </View>
            <View style={styles.joinCtaText}>
              <ThemedText type="smallBold">Members only</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Join this community to post messages and announcements.
              </ThemedText>
            </View>
          </View>
          <PrimaryButton
            label="Join community"
            onPress={toggleMembership}
            disabled={togglingMembership}
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

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
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
  const colors = useTheme();
  const tints = useTints();
  const indigo = tints.indigo;

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete post',
      message: 'This post will be removed for everyone in the community.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) onDelete();
  };

  return (
    <View
      style={[
        styles.postCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.postHeader}>
        <View
          style={[
            styles.postAvatar,
            { backgroundColor: indigo.bg, borderColor: indigo.border },
          ]}
        >
          <ThemedText style={[styles.postAvatarLabel, { color: indigo.fg }]}>
            {initialsOf(post.authorName)}
          </ThemedText>
        </View>
        <View style={styles.postHeading}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {post.authorName}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {formatRelativeTime(post.createdAt) || formatDateFallback(post.createdAt)}
          </ThemedText>
        </View>
        {canDelete && (
          <Pressable
            onPress={() => {
              void handleDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete post"
            hitSlop={6}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </Pressable>
        )}
      </View>

      {post.isAnnouncement && <Badge label="Announcement" tone="warning" />}
      <ThemedText style={styles.postContent}>{post.content}</ThemedText>
    </View>
  );
}

/** Absolute-date fallback for posts older than the relative window. */
function formatDateFallback(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two + 2,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  university: {
    flexShrink: 1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  postsLoading: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  list: {
    gap: Spacing.two + 2,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    gap: Spacing.two - 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 15,
  },
  postHeading: {
    flex: 1,
    gap: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  postContent: {
    fontSize: 12,
    lineHeight: 17,
  },
  composerCard: {
    borderWidth: 1,
    elevation: 1,
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
  joinCta: {
    gap: Spacing.three - 4,
  },
  joinCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  joinCtaBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCtaText: {
    flex: 1,
    gap: 2,
  },
});
