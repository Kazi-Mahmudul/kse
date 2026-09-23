import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { FontFamilies, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/features/communities/format';
import { useModeratePost, useToggleReaction } from '@/features/communities/queries';
import { ActionSheet, type ActionOption } from './action-sheet';
import { PollBlock } from './poll-block';
import { ReportSheet } from './report-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { confirmDialog } from '@/lib/confirm';
import type { IconName } from '@/types/icon';
import type { CommunityPost, CommunityPostType } from '@kse/types';

const TYPE_LABELS: Record<CommunityPostType, string> = {
  discussion: 'Discussion',
  question: 'Question',
  opportunity: 'Opportunity',
  announcement: 'Announcement',
  poll: 'Poll',
};

const TYPE_ICONS: Record<CommunityPostType, IconName> = {
  discussion: 'chatbubble-outline',
  question: 'help-circle-outline',
  opportunity: 'briefcase-outline',
  announcement: 'megaphone-outline',
  poll: 'stats-chart-outline',
};

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * Feed card for every post type (spec §Posts): author row, badges, optional
 * image/link, inline poll, like button and comment count. The "…" menu offers
 * report for everyone and pin/lock/delete for authors + moderators —
 * authorization is enforced by RLS, the menu just avoids dead ends.
 */
export function PostCard({
  post,
  viewerId,
  viewerCanModerate,
}: {
  post: CommunityPost;
  viewerId: string | null;
  viewerCanModerate: boolean;
}) {
  const colors = useTheme();
  const tints = useTints();
  const router = useRouter();
  const reaction = useToggleReaction();
  const moderate = useModeratePost(post.communityId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const indigo = tints.indigo;
  const isAuthor = Boolean(viewerId && post.authorId === viewerId);
  const canModerateThis = viewerCanModerate || isAuthor;

  const menuOptions: ActionOption[] = [
    { key: 'report', label: 'Report post', icon: 'flag-outline', description: 'Send to moderators' },
    ...(viewerCanModerate
      ? [
          {
            key: 'pin',
            label: post.isPinned ? 'Unpin post' : 'Pin post',
            icon: 'pin-outline' as const,
            description: post.isPinned ? 'Remove from the top' : 'Keep at the top of the feed',
          },
          {
            key: 'lock',
            label: post.isLocked ? 'Unlock comments' : 'Lock comments',
            icon: 'lock-closed-outline' as const,
            description: post.isLocked ? 'Let members reply again' : 'Stop new comments',
          },
        ]
      : []),
    ...(canModerateThis
      ? [
          {
            key: 'delete',
            label: 'Delete post',
            icon: 'trash-outline' as const,
            description: 'Remove for everyone',
            destructive: true,
          },
        ]
      : []),
  ];

  const onMenuSelect = async (key: string) => {
    if (key === 'report') {
      setReportOpen(true);
      return;
    }
    if (key === 'pin' || key === 'lock') {
      moderate.mutate(
        key === 'pin' ? { kind: 'pin', post } : { kind: 'lock', post, locked: !post.isLocked },
      );
      return;
    }
    if (key === 'delete') {
      const ok = await confirmDialog({
        title: 'Delete post',
        message: 'This post will be removed for everyone in the community.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (ok) moderate.mutate({ kind: 'delete', post });
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: post.isPinned ? colors.primary : colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: indigo.bg, borderColor: indigo.border }]}>
          {post.authorAvatarUrl ? (
            <Image
              source={{ uri: post.authorAvatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={120}
              recyclingKey={post.authorId}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <ThemedText style={[styles.avatarLabel, { color: indigo.fg }]}>
              {initialsOf(post.authorName)}
            </ThemedText>
          )}
        </View>
        <View style={styles.heading}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {post.authorName}
            {post.communityName ? (
              <ThemedText type="small" themeColor="textSecondary">
                {'  in  '}
                {post.communityName}
              </ThemedText>
            ) : null}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {formatRelativeTime(post.createdAt)}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Post actions"
          hitSlop={6}
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {(post.postType !== 'discussion' || post.isPinned || post.isLocked) && (
        <View style={styles.badgeRow}>
          {post.postType !== 'discussion' && (
            <Badge
              label={TYPE_LABELS[post.postType]}
              tone={post.postType === 'announcement' ? 'warning' : 'primary'}
            />
          )}
          {post.isPinned && <Badge label="Pinned" tone="neutral" />}
          {post.isLocked && <Badge label="Locked" tone="danger" />}
        </View>
      )}

      {post.status !== 'active' ? (
        <View style={styles.removedPlaceholder}>
          <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
          <ThemedText type="small" themeColor="textMuted">
            Removed by moderator
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedText style={styles.content}>{post.content}</ThemedText>

          {post.imageUrl ? (
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={120}
              recyclingKey={post.id}
            />
          ) : null}

          {post.linkUrl ? (
            <Pressable
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.linkRow,
                { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                pressed && styles.pressed,
              ]}
              onPress={() => Linking.openURL(post.linkUrl!).catch(() => undefined)}
            >
              <Ionicons name="link-outline" size={13} color={colors.primary} />
              <ThemedText type="small" themeColor="primary" numberOfLines={1} style={styles.linkText}>
                {post.linkUrl}
              </ThemedText>
            </Pressable>
          ) : null}

          {post.postType === 'poll' && post.poll ? (
            <PollBlock poll={post.poll} postId={post.id} />
          ) : null}
        </>
      )}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}
          disabled={reaction.isPending}
          onPress={() => reaction.mutate({ post })}
        >
          <Ionicons
            name={post.viewerReacted ? 'heart' : 'heart-outline'}
            size={16}
            color={post.viewerReacted ? colors.danger : colors.textSecondary}
          />
          <ThemedText
            type="small"
            themeColor={post.viewerReacted ? 'danger' : 'textSecondary'}
          >
            {post.reactionCount > 0 ? post.reactionCount : 'Like'}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/community/post/[id]',
              params: { id: post.id },
            })
          }
        >
          <Ionicons
            name={TYPE_ICONS[post.postType]}
            size={14}
            color={colors.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {post.commentCount > 0 ? `${post.commentCount} comment${post.commentCount === 1 ? '' : 's'}` : 'Comment'}
          </ThemedText>
        </Pressable>
      </View>

      <ActionSheet
        visible={menuOpen}
        title="Post actions"
        options={menuOptions}
        onSelect={(key) => {
          void onMenuSelect(key);
        }}
        onClose={() => setMenuOpen(false)}
      />
      <ReportSheet
        visible={reportOpen}
        targetType="community_post"
        targetId={post.id}
        onClose={() => setReportOpen(false)}
      />
      {moderate.isError && (
        <ThemedText type="small" themeColor="danger">
          {(moderate.error as Error).message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    gap: Spacing.two - 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 15,
  },
  heading: {
    flex: 1,
    gap: 1,
  },
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  content: {
    fontSize: 12,
    lineHeight: 17,
  },
  image: {
    borderRadius: 12,
    height: 160,
    width: '100%',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  linkText: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: 2,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  removedPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
});
