import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import {
  ActionSheet,
  type ActionOption,
} from '@/features/communities/components/action-sheet';
import { CommunityListCard } from '@/features/communities/components/community-list-card';
import { CommunityFab } from '@/features/communities/components/fab';
import { EventCard } from '@/features/communities/components/event-card';
import { PostCard } from '@/features/communities/components/post-card';
import {
  useCategories,
  useCommunitySearch,
  useFollowedTopics,
  useJoinedCommunities,
  useMyRequests,
  useRecommendedCommunities,
  useToggleFollowTopic,
  useTrendingPosts,
  useUpcomingEvents,
} from '@/features/communities/queries';
import { SUGGESTED_TOPICS } from '@/features/communities/service';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Tab = 'for-you' | 'following' | 'discover';

const TAB_OPTIONS = [
  { value: 'for-you' as const, label: 'For You' },
  { value: 'following' as const, label: 'Following' },
  { value: 'discover' as const, label: 'Discover' },
];

/**
 * Community home (spec §Discovery): For You (trending + recommendations +
 * upcoming events), Following (joined communities + own requests) and
 * Discover (search + category browse). The FAB offers post/poll/request
 * creation scoped to what the current user may do.
 */
export default function CommunityScreen() {
  const [tab, setTab] = useState<Tab>('for-you');
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

  return (
    <Screen>
      <ThemedText type="title" style={styles.title}>
        Community
      </ThemedText>
      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      <View style={styles.tabBody}>
        {tab === 'for-you' && <ForYouTab viewerId={viewerId} />}
        {tab === 'following' && <FollowingTab viewerId={viewerId} />}
        {tab === 'discover' && <DiscoverTab viewerId={viewerId} />}
      </View>
      {viewerId === null ? (
        <SignInPrompt />
      ) : (
        <CommunityActionsFab />
      )}
    </Screen>
  );
}

// ── For You ──────────────────────────────────────────────────────────────────

function ForYouTab({ viewerId }: { viewerId: string | null }) {
  const colors = useTheme();
  const trending = useTrendingPosts(4);
  const recommended = useRecommendedCommunities(4);
  const events = useUpcomingEvents(3);
  const followed = useFollowedTopics(viewerId !== null);
  const toggleFollow = useToggleFollowTopic();
  const isAuthed = viewerId !== null;

  const recommendedEmpty =
    isAuthed &&
    recommended.isSuccess &&
    (recommended.data?.length ?? 0) === 0;
  const trendingEmpty =
    !recommendedEmpty &&
    trending.isSuccess &&
    (trending.data?.length ?? 0) === 0;

  return (
    <View style={styles.stack}>
      {isAuthed && (
        <FollowedTopicsRow
          followed={followed.data ?? []}
          isAuthed={isAuthed}
          onToggle={(topic, shouldFollow) =>
            toggleFollow.mutate({ topic, shouldFollow })
          }
        />
      )}

      <SectionHeader title="Trending discussions" />
      {trending.isPending && <Loading />}
      {trending.isError && (
        <ErrorState
          message={(trending.error as Error).message}
          onRetry={() => trending.refetch()}
        />
      )}
      {trendingEmpty && (
        <EmptyState
          icon="chatbubbles-outline"
          title="No discussions yet"
          message="Community activity from the past week will show up here."
        />
      )}
      {trending.data?.map((post) => (
        <PostCard key={post.id} post={post} viewerId={viewerId} viewerCanModerate={false} />
      ))}

      <SectionHeader title="Recommended for you" />
      {recommended.isPending && <Loading />}
      {recommended.isError && (
        <ErrorState
          message={(recommended.error as Error).message}
          onRetry={() => recommended.refetch()}
        />
      )}
      {recommendedEmpty && (
        <EmptyState
          icon="compass-outline"
          title="No recommendations yet"
          message={
            isAuthed
              ? 'Follow a few topics above to seed the recommendation feed.'
              : 'Sign in and follow topics to get personalized suggestions.'
          }
        />
      )}
      {recommended.data && recommended.data.length > 0 &&
        recommended.data.map((community) => (
          <CommunityListCard key={community.id} community={community} />
        ))}

      {events.data && events.data.length > 0 && (
        <>
          <SectionHeader title="Upcoming community events" />
          {events.data.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </>
      )}
    </View>
  );
}

/** Followed-topic chip row for the For You empty state. Tap a chip to
 *  follow / unfollow; the row seeds the recommendation signal when the
 *  user has no interests / skills / topics yet. */
function FollowedTopicsRow({
  followed,
  isAuthed,
  onToggle,
}: {
  followed: string[];
  isAuthed: boolean;
  onToggle: (topic: string, shouldFollow: boolean) => void;
}) {
  const colors = useTheme();
  const allTopics = followed.slice();
  for (const t of SUGGESTED_TOPICS) {
    if (!allTopics.includes(t)) allTopics.push(t);
  }
  return (
    <View style={styles.topicSection}>
      <ThemedText type="smallBold" style={styles.topicTitle}>
        Follow topics
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.topicHint}>
        Topics you follow influence your recommendation feed.
      </ThemedText>
      <View style={styles.topicRow}>
        {allTopics.map((topic) => {
          const isFollowed = followed.includes(topic);
          return (
            <Pressable
              key={topic}
              accessibilityRole="button"
              accessibilityState={{ selected: isFollowed }}
              disabled={!isAuthed}
              onPress={() => isAuthed && onToggle(topic, !isFollowed)}
              style={({ pressed }) => [
                styles.topicChip,
                {
                  borderColor: isFollowed ? colors.primary : colors.border,
                  backgroundColor: isFollowed ? `${colors.primary}14` : colors.background,
                },
                pressed && styles.pressed,
                !isAuthed && styles.topicChipDisabled,
              ]}
            >
              <Ionicons
                name={isFollowed ? 'bookmark' : 'bookmark-outline'}
                size={12}
                color={isFollowed ? colors.primary : colors.textMuted}
              />
              <ThemedText
                type="small"
                themeColor={isFollowed ? 'primary' : 'textSecondary'}
                style={styles.topicChipLabel}
              >
                {topic}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Following ────────────────────────────────────────────────────────────────

function FollowingTab({ viewerId }: { viewerId: string | null }) {
  const joined = useJoinedCommunities(viewerId !== null);
  const requests = useMyRequests();

  if (viewerId === null) {
    return (
      <View style={styles.stack}>
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in to follow communities"
          message="Once you sign in you can join communities, post discussions and request new ones."
        />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <SectionHeader title="Your communities" />
      {joined.isPending && <Loading />}
      {joined.isError && (
        <ErrorState
          message={(joined.error as Error).message}
          onRetry={() => joined.refetch()}
        />
      )}
      {joined.isSuccess && joined.data.length === 0 && (
        <EmptyState
          icon="people-outline"
          title="Not following any community"
          message="Discover communities matched to your university and interests."
        />
      )}
      {joined.data?.map((community) => (
        <CommunityListCard key={community.id} community={community} />
      ))}

      {requests.data && requests.data.length > 0 && (
        <>
          <SectionHeader title="Your community requests" />
          {requests.data.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <View style={styles.requestInfo}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {request.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {request.categoryName ?? 'Uncategorized'} ·{' '}
                  {request.status === 'pending'
                    ? 'waiting for review'
                    : request.status === 'approved'
                      ? 'approved'
                      : (request.reviewNote ?? 'rejected')}
                </ThemedText>
              </View>
              <Badge
                label={
                  request.status === 'pending'
                    ? 'Pending'
                    : request.status === 'approved'
                      ? 'Approved'
                      : 'Rejected'
                }
                tone={
                  request.status === 'approved'
                    ? 'success'
                    : request.status === 'rejected'
                      ? 'danger'
                      : 'warning'
                }
              />
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ── Discover ─────────────────────────────────────────────────────────────────

function DiscoverTab({ viewerId }: { viewerId: string | null }) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 350);
  const categories = useCategories();

  const filters = useMemo(
    () => ({
      query: debouncedQuery.trim() || undefined,
      categoryId,
    }),
    [debouncedQuery, categoryId],
  );
  const search = useCommunitySearch(filters);

  const items = search.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.stack}>
      {viewerId === null && (
        <View style={styles.signInRibbon}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
          <ThemedText type="small" themeColor="primary" style={styles.signInRibbonText}>
            Sign in to join a community or post in one.
          </ThemedText>
        </View>
      )}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search communities…"
        variant="card"
      />
      {categories.data && categories.data.length > 0 && (
        <View style={styles.categoryRow}>
          <CategoryChip
            label="All"
            active={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {categories.data.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              active={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </View>
      )}

      {search.isPending && <Loading />}
      {search.isError && (
        <ErrorState
          message={(search.error as Error).message}
          onRetry={() => search.refetch()}
        />
      )}
      {search.isSuccess && items.length === 0 && (
        <EmptyState
          icon="search-outline"
          title="No communities found"
          message="Try a different search or category — or request a new community."
        />
      )}

      {items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommunityListCard community={item} />}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            search.isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          scrollEnabled={false}
          contentContainerStyle={styles.stack}
        />
      )}
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? `${colors.primary}14` : colors.background,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={active ? 'checkmark-circle' : 'checkmark-circle-outline'}
        size={12}
        color={active ? colors.primary : colors.textMuted}
      />
      <ThemedText
        type="small"
        themeColor={active ? 'primary' : 'textSecondary'}
        style={styles.categoryChipLabel}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function Loading() {
  const colors = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Could not load"
      message={message}
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

/**
 * Auth-gated CTA rendered in place of the create-FAB when there is no
 * signed-in viewer. Goes to the login screen via expo-router so the user
 * comes back to /community afterwards.
 */
function SignInPrompt() {
  const router = useRouter();
  const colors = useTheme();
  return (
    <View
      style={[
        styles.signInPrompt,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
      <View style={styles.signInPromptText}>
        <ThemedText type="smallBold">Sign in to participate</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Join communities, post discussions, run polls and request new ones.
        </ThemedText>
      </View>
      <PrimaryButton
        label="Sign in"
        size="compact"
        onPress={() => router.push('/(auth)/login')}
      />
    </View>
  );
}

// ── FAB + action sheets ──────────────────────────────────────────────────────

function CommunityActionsFab() {
  const router = useRouter();
  const joined = useJoinedCommunities(true);
  const [mainOpen, setMainOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<'post' | 'poll' | null>(null);

  const mainOptions: ActionOption[] = [
    {
      key: 'post',
      label: 'Create post',
      description: 'Share a discussion, question or opportunity',
      icon: 'create-outline',
    },
    {
      key: 'poll',
      label: 'Create poll',
      description: 'Ask members a quick question',
      icon: 'stats-chart-outline',
    },
    {
      key: 'request',
      label: 'Request a community',
      description: 'Admins review new community requests',
      icon: 'add-circle-outline',
    },
  ];

  const joinedCommunities = joined.data ?? [];

  return (
    <>
      <CommunityFab onPress={() => setMainOpen(true)} />
      <ActionSheet
        visible={mainOpen}
        title="Create in community"
        options={mainOptions}
        onSelect={(key) => {
          if (key === 'request') {
            router.push('/(tabs)/community/create-request');
          } else {
            setPickerFor(key as 'post' | 'poll');
          }
        }}
        onClose={() => setMainOpen(false)}
      />
      <ActionSheet
        visible={pickerFor !== null}
        title={pickerFor === 'poll' ? 'Create poll in…' : 'Create post in…'}
        options={
          joinedCommunities.length > 0
            ? joinedCommunities.map((community) => ({
                key: community.id,
                label: community.name,
                icon: 'people-outline' as const,
              }))
            : [
                {
                  key: '__empty__',
                  label: 'Join a community first',
                  icon: 'information-circle-outline' as const,
                },
              ]
        }
        onSelect={(key) => {
          if (key === '__empty__' || !pickerFor) return;
          router.push({
            pathname:
              pickerFor === 'poll'
                ? '/(tabs)/community/[id]/create-poll'
                : '/(tabs)/community/[id]/create-post',
            params: { id: key },
          });
        }}
        onClose={() => setPickerFor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.two + 2,
  },
  tabBody: {
    marginTop: Spacing.two + 2,
  },
  stack: {
    gap: Spacing.two + 2,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  footerLoader: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  requestInfo: {
    flex: 1,
    gap: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two - 2,
    paddingVertical: 4,
  },
  categoryChipLabel: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  signInRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two - 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  signInRibbonText: {
    flexShrink: 1,
  },
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
  },
  signInPromptText: {
    flex: 1,
    gap: 2,
  },
  topicSection: {
    gap: Spacing.one,
  },
  topicTitle: {
    color: undefined,
  },
  topicHint: {
    marginBottom: Spacing.one,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two - 2,
    paddingVertical: 4,
  },
  topicChipLabel: {
    fontSize: 12,
  },
  topicChipDisabled: {
    opacity: 0.5,
  },
});
