import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { FontFamilies, Spacing } from '@/constants/theme';
import { ActionSheet, type ActionOption } from '@/features/communities/components/action-sheet';
import { CommunityFab } from '@/features/communities/components/fab';
import { EventCard } from '@/features/communities/components/event-card';
import { PostCard } from '@/features/communities/components/post-card';
import { ReportSheet } from '@/features/communities/components/report-sheet';
import { formatMemberCount } from '@/features/communities/format';
import {
  useCommunity,
  useCommunityEvents,
  useCommunityPosts,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

type DetailTab = 'posts' | 'events';

const ROLE_LABELS: Partial<Record<'moderator' | 'owner', string>> = {
  moderator: 'Moderator',
  owner: 'Owner',
};

/**
 * Community page (spec §Community page): header with image, member count and
 * join/leave, description, rules and moderators, then Posts / Events tabs.
 * The feed lists pinned posts first; members get the create FAB.
 */
export default function CommunityDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<DetailTab>('posts');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const communityQuery = useCommunity(id);
  const postsQuery = useCommunityPosts(id);
  const eventsQuery = useCommunityEvents(id);
  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();

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
  const isMember = community.isMember;
  const canModerate = community.role === 'moderator' || community.role === 'owner';
  const togglingMembership = joinMutation.isPending || leaveMutation.isPending;
  const toggleMembership = () => {
    if (togglingMembership) return;
    if (isMember) {
      leaveMutation.mutate(community.id, {
        onSuccess: () => analytics.communityJoined(community.id, false),
      });
    } else {
      joinMutation.mutate(community.id, {
        onSuccess: () => analytics.communityJoined(community.id, true),
      });
    }
  };

  const fabOptions: ActionOption[] = [
    {
      key: 'post',
      label: 'Create post',
      description: canModerate ? 'Discussion, question, opportunity or announcement' : 'Share with the community',
      icon: 'create-outline',
    },
    {
      key: 'poll',
      label: 'Create poll',
      description: 'Ask members a quick question',
      icon: 'stats-chart-outline',
    },
    ...(canModerate
      ? [
          {
            key: 'event',
            label: 'Create event',
            description: 'Schedule an online or offline meetup',
            icon: 'calendar-outline' as const,
          },
        ]
      : []),
  ];

  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const events = eventsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const scope = community.departmentName ?? community.universityName;

  return (
    <Screen>
      <BackHeader title="Community" />

      {/* Header — image, name, category, member count, join/leave. */}
      <Card
        tint="background"
        style={[
          styles.hero,
          { borderColor: colors.border, boxShadow: `0px 4px 8px ${colors.shadow}` },
        ]}
      >
        <View style={styles.heroTop}>
          {community.coverImageUrl ? (
            <Image
              source={{ uri: community.coverImageUrl }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View
              style={[styles.heroInitials, { backgroundColor: `${colors.primary}14` }]}
            >
              <ThemedText themeColor="primary" style={styles.heroInitialsText}>
                {community.name.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.heroTitleBlock}>
            <ThemedText themeColor="heading" style={styles.heroName} numberOfLines={2}>
              {community.name}
            </ThemedText>
            <View style={styles.heroMeta}>
              {community.categoryName ? (
                <ThemedText type="small" themeColor="primary" style={styles.heroCategory}>
                  {community.categoryName}
                </ThemedText>
              ) : null}
              {scope ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {scope}
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.heroMeta}>
              <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {formatMemberCount(community.memberCount)}{' '}
                {community.memberCount === 1 ? 'member' : 'members'}
              </ThemedText>
            </View>
          </View>
        </View>

        {community.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
            {community.description}
          </ThemedText>
        ) : null}

        <View style={styles.heroActions}>
          <PrimaryButton
            label={togglingMembership ? 'Saving…' : isMember ? 'Leave' : 'Join'}
            variant={isMember ? 'outline' : 'primary'}
            size="compact"
            onPress={toggleMembership}
            disabled={togglingMembership}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setReportOpen(true)}
            style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}
          >
            <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {isMember && community.role && community.role !== 'member' && ROLE_LABELS[community.role] ? (
          <View style={styles.badgeRow}>
            <Badge label="Joined" tone="success" />
            <Badge label={ROLE_LABELS[community.role] as string} tone="neutral" />
          </View>
        ) : isMember ? (
          <Badge label="Joined" tone="success" />
        ) : null}
      </Card>

      {/* About — rules + moderators (collapsible). */}
      {(community.rules.length > 0 || community.moderators.length > 0) && (
        <Card tint="backgroundElement" style={styles.aboutCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRulesOpen((v) => !v)}
            style={({ pressed }) => [styles.aboutHeader, pressed && styles.pressed]}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <ThemedText type="smallBold" style={styles.aboutTitle}>
              Rules &amp; moderators
            </ThemedText>
            <Ionicons
              name={rulesOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textMuted}
            />
          </Pressable>
          {rulesOpen && (
            <View style={styles.aboutBody}>
              {community.rules.map((rule, index) => (
                <View key={index} style={styles.ruleRow}>
                  <ThemedText type="small" themeColor="primary">
                    {index + 1}.
                  </ThemedText>
                  <ThemedText type="small" style={styles.ruleText}>
                    {rule}
                  </ThemedText>
                </View>
              ))}
              {community.moderators.length > 0 && (
                <View style={styles.moderatorRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Moderated by{' '}
                  </ThemedText>
                  {community.moderators.map((mod, index) => (
                    <ThemedText key={mod.userId} type="small" themeColor="textSecondary">
                      {mod.fullName}
                      {mod.role === 'owner' ? ' (owner)' : ''}
                      {index < community.moderators.length - 1 ? ', ' : ''}
                    </ThemedText>
                  ))}
                </View>
              )}
            </View>
          )}
        </Card>
      )}

      {/* Posts / Events tabs. */}
      <SegmentedControl
        options={[
          { value: 'posts' as const, label: 'Posts' },
          { value: 'events' as const, label: 'Events' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'posts' ? (
        <View style={styles.feedStack}>
          <SectionHeader title={posts.some((p) => p.isPinned) ? 'Pinned & latest' : 'Discussion'} />
          {postsQuery.isPending && (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          {postsQuery.isError && (
            <EmptyState
              icon="cloud-offline-outline"
              title="Could not load posts"
              message={(postsQuery.error as Error).message}
              actionLabel="Try again"
              onAction={() => postsQuery.refetch()}
            />
          )}
          {postsQuery.isSuccess && posts.length === 0 && (
            <EmptyState
              icon="chatbubbles-outline"
              title="No posts yet"
              message={
                isMember
                  ? 'Be the first to start a conversation.'
                  : 'Join this community to start the conversation.'
              }
            />
          )}
          {posts.length > 0 && (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PostCard post={item} viewerId={viewerId} viewerCanModerate={canModerate} />
              )}
              onEndReached={() => {
                if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
                  postsQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                postsQuery.isFetchingNextPage ? (
                  <View style={styles.loading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              scrollEnabled={false}
              contentContainerStyle={styles.feedStack}
            />
          )}
        </View>
      ) : (
        <View style={styles.feedStack}>
          <SectionHeader title="Community events" />
          {eventsQuery.isPending && (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          {eventsQuery.isError && (
            <EmptyState
              icon="cloud-offline-outline"
              title="Could not load events"
              message={(eventsQuery.error as Error).message}
              actionLabel="Try again"
              onAction={() => eventsQuery.refetch()}
            />
          )}
          {eventsQuery.isSuccess && events.length === 0 && (
            <EmptyState
              icon="calendar-outline"
              title="No events scheduled"
              message={
                canModerate
                  ? 'Create the first community event with the + button.'
                  : 'Check back soon — moderators can schedule meetups here.'
              }
            />
          )}
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      )}

      {!isMember && (
        <Card tint="warning" style={styles.joinCta}>
          <View style={styles.joinCtaRow}>
            <View style={styles.joinCtaBadge}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.warning} />
            </View>
            <View style={styles.joinCtaText}>
              <ThemedText type="smallBold">Members only</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Join this community to post, comment, vote in polls and RSVP to events.
              </ThemedText>
            </View>
          </View>
          <PrimaryButton label="Join community" onPress={toggleMembership} disabled={togglingMembership} />
        </Card>
      )}

      {isMember && (
        <>
          <CommunityFab onPress={() => setFabOpen(true)} />
          <ActionSheet
            visible={fabOpen}
            title={`Create in ${community.name}`}
            options={fabOptions}
            onSelect={(key) => {
              if (key === 'event') {
                router.push({
                  pathname: '/(tabs)/community/[id]/create-event',
                  params: { id: community.id },
                });
              } else if (key === 'poll') {
                router.push({
                  pathname: '/(tabs)/community/[id]/create-poll',
                  params: { id: community.id },
                });
              } else {
                router.push({
                  pathname: '/(tabs)/community/[id]/create-post',
                  params: { id: community.id },
                });
              }
            }}
            onClose={() => setFabOpen(false)}
          />
        </>
      )}

      <ReportSheet
        visible={reportOpen}
        targetType="community"
        targetId={community.id}
        onClose={() => setReportOpen(false)}
      />
    </Screen>
  );
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
  heroImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  heroInitials: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitialsText: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
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
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroCategory: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  reportButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  aboutCard: {
    gap: Spacing.one + 2,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  aboutTitle: {
    flex: 1,
  },
  aboutBody: {
    gap: Spacing.one + 2,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  ruleText: {
    flex: 1,
  },
  moderatorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  feedStack: {
    gap: Spacing.two + 2,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
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
  pressed: {
    opacity: 0.7,
  },
});
