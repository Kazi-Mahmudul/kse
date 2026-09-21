import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies, Spacing } from '@/constants/theme';
import { CommunityTileCard } from '@/features/communities/components/community-tile-card';
import { RecentDiscussionCard } from '@/features/communities/components/recent-discussion-card';
import {
  useCommunities,
  useRecentPosts,
} from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Community tab (spec 09._community_kse):
 *   • 24px page title
 *   • Search bar + filter button
 *   • "Your Communities" — 2×2 grid (top 4 joined, or first 4 active if none)
 *   • "Recent Discussions" — latest active posts across every community
 *   • "Browse all communities" link below the grid for discovery
 *
 * No schema migrations were required for this redesign — `community_posts`
 * already had everything the Recent Discussions list needed; only a new
 * `listRecentPosts(limit)` query was added in `features/communities/`.
 */
export default function CommunityScreen() {
  const colors = useTheme();
  const communitiesQuery = useCommunities();
  const recentQuery = useRecentPosts(8);
  const [query, setQuery] = useState('');

  const all = useMemo(() => communitiesQuery.data ?? [], [communitiesQuery.data]);
  const recent = useMemo(() => recentQuery.data ?? [], [recentQuery.data]);

  // 1) Joined communities first, then the rest. Cap at 4 for the 2x2 grid.
  const gridTiles = useMemo(() => {
    const joined = all.filter((c) => c.isMember);
    const fallback = all.filter((c) => !c.isMember);
    return [...joined, ...fallback].slice(0, 4);
  }, [all]);

  // 2) Client-side filter. While searching, every matching community shows
  //    (the 4-tile cap is a browse-state constraint, not a search limit) and
  //    Recent Discussions narrows to matching posts.
  const normalizedQuery = query.trim().toLowerCase();
  const communityMatches = useMemo(() => {
    if (!normalizedQuery) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        (c.description ?? '').toLowerCase().includes(normalizedQuery) ||
        (c.universityName ?? '').toLowerCase().includes(normalizedQuery) ||
        c.slug.toLowerCase().includes(normalizedQuery),
    );
  }, [all, normalizedQuery]);
  const filteredTiles = normalizedQuery ? communityMatches : gridTiles;
  const filteredRecent = useMemo(() => {
    if (!normalizedQuery) return recent;
    return recent.filter(
      (post) =>
        post.content.toLowerCase().includes(normalizedQuery) ||
        post.communityName.toLowerCase().includes(normalizedQuery) ||
        post.authorName.toLowerCase().includes(normalizedQuery),
    );
  }, [recent, normalizedQuery]);

  const showFilterPlaceholder = () =>
    Alert.alert(
      'Filter communities',
      'University + topic filters are coming soon. For now, use the search bar above.',
    );

  const showAllCommunitiesPlaceholder = () =>
    Alert.alert(
      'All communities',
      `You're a member of ${all.filter((c) => c.isMember).length} of ${all.length} communities. The full browse view ships in a future release.`,
    );

  // Spinner only while the request is in flight — the search filter itself is
  // synchronous, so a no-match search shows the empty state, not a loader.
  const showGridLoading = communitiesQuery.isPending;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" style={styles.pageTitle}>
          Community
        </ThemedText>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search communities..."
          variant="card"
          onFilterPress={showFilterPlaceholder}
        />
      </View>

      {normalizedQuery ? (
        <ThemedText type="small" themeColor="textSecondary">
          {communityMatches.length} {communityMatches.length === 1 ? 'community' : 'communities'} ·{' '}
          {filteredRecent.length} {filteredRecent.length === 1 ? 'discussion' : 'discussions'}
        </ThemedText>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title={normalizedQuery ? 'Communities' : 'Your Communities'}
          actionLabel={
            !normalizedQuery && !communitiesQuery.isPending && all.length > 4
              ? 'View All'
              : undefined
          }
          onAction={all.length > 4 ? showAllCommunitiesPlaceholder : undefined}
        />
      </View>

      {showGridLoading && !communitiesQuery.isError && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {communitiesQuery.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load communities"
          message={(communitiesQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => communitiesQuery.refetch()}
        />
      ) : null}

      {!communitiesQuery.isError && !communitiesQuery.isPending && filteredTiles.length > 0 ? (
        <View style={styles.grid}>
          {filteredTiles.map((community) => (
            <View key={community.id} style={styles.gridCell}>
              <CommunityTileCard community={community} />
            </View>
          ))}
        </View>
      ) : null}

      {!communitiesQuery.isError &&
      !communitiesQuery.isPending &&
      communitiesQuery.isSuccess &&
      all.length > 0 &&
      filteredTiles.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          message={`No communities or discussions match "${query.trim()}".`}
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      ) : null}

      {!communitiesQuery.isError &&
      !communitiesQuery.isPending &&
      communitiesQuery.isSuccess &&
      all.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No communities yet"
          message="Verified communities around Khulna universities will appear here."
        />
      ) : null}

      {all.length > filteredTiles.length && filteredTiles.length > 0 && !normalizedQuery ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.moreLine}
        >
          +{all.length - filteredTiles.length} more communities
        </ThemedText>
      ) : null}

      {(!normalizedQuery || filteredRecent.length > 0) && (
        <View style={[styles.section, styles.recentSection]}>
          <SectionHeader title="Recent Discussions" />
        </View>
      )}

      {!normalizedQuery && recentQuery.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {recentQuery.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load discussions"
          message={(recentQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => recentQuery.refetch()}
        />
      ) : null}

      {!normalizedQuery && recentQuery.isSuccess && recent.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No discussions yet"
          message="Posts from every community will show here."
        />
      ) : null}

      {filteredRecent.length > 0 ? (
        <View style={styles.recentList}>
          {filteredRecent.map((post) => (
            <RecentDiscussionCard key={post.id} post={post} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * The screen rides inside the shared `Screen` chrome so it inherits the
 * themed background, centered 480 max-width and bottom-tab inset. We add
 * tighter section rhythm (12 / 20) that matches the spec's denser
 * community layout.
 */
const styles = StyleSheet.create({
  headerRow: {
    marginTop: Spacing.two,
  },
  pageTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  searchRow: {
    marginTop: Spacing.two,
  },
  section: {
    marginTop: Spacing.four,
  },
  recentSection: {
    marginTop: Spacing.five,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  gridCell: {
    width: '50%',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  moreLine: {
    marginTop: Spacing.one,
    textAlign: 'right',
  },
  recentList: {
    gap: Spacing.two,
  },
});
