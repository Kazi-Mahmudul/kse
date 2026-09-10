import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { FontFamilies, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/features/communities/format';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { CommunityRecentPost } from '@kse/types';

interface RecentDiscussionCardProps {
  post: CommunityRecentPost;
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

/**
 * Recent Discussions row (spec 09._community_kse).
 *
 * Surface chrome + border + shadow are theme-driven via `<Card>` + tokens.
 * The initials avatar uses the `indigo` tint palette so it stays readable
 * in both light (soft indigo wash on white) and dark (translucent brand
 * glass on black) modes.
 *
 * The spec shows comment counts next to the time footer, but
 * `community_posts` doesn't currently carry a comment count — once a
 * comments table is in place the row will gain it here.
 */
export function RecentDiscussionCard({ post }: RecentDiscussionCardProps) {
  const colors = useTheme();
  const tints = useTints();
  const indigo = tints.indigo;

  const open = () =>
    router.push({
      pathname: '/(tabs)/community/[id]',
      params: { id: post.communityId },
    });

  return (
    <Card
      tint="background"
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open discussion in ${post.communityName}`}
      style={[
        styles.row,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.body}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: indigo.bg,
              borderColor: indigo.border,
            },
          ]}
        >
          <ThemedText style={[styles.avatarLabel, { color: indigo.fg }]}>
            {initialsOf(post.authorName)}
          </ThemedText>
        </View>
        <View style={styles.content}>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
            {post.content}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {post.authorName} in{' '}
            <ThemedText type="small" themeColor="heading">
              {post.communityName}
            </ThemedText>
          </ThemedText>
          <View style={styles.meta}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
              {formatRelativeTime(post.createdAt) || 'recent'}
            </ThemedText>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingRight: Spacing.one,
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
