import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityFilterBar } from '@/components/opportunity-filter-bar';
import { ThemedText } from '@/components/themed-text';
import { TutorCard } from '@/components/tutor-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { CommunityTileCard } from '@/features/communities/components/community-tile-card';
import { useCommunities } from '@/features/communities/queries';
import { useOpportunityFeed } from '@/features/opportunities/queries';
import type { OpportunityFilters } from '@/features/opportunities/service';
import {
  useSavedTutorIds,
  useToggleSavedTutor,
  useTutorFeed,
} from '@/features/tuition/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

/** Preview caps for the cross-entity sections; "See all" opens the full list. */
const TUTOR_PREVIEW = 3;
const COMMUNITY_PREVIEW = 4;

/**
 * Global search (step 9): debounced free-text over everything the platform
 * hosts — opportunities (prefix full-text search), tutors and communities —
 * plus type / mode / deadline chips fed through the shared opportunity feed.
 *
 * Tutor and community sections only appear while the query is the sole
 * criterion: a type/mode/deadline chip scopes the screen to opportunities,
 * and showing tutors that ignore those chips would be misleading.
 */
export default function SearchScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(typeof params.q === 'string' ? params.q : '');
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const debouncedText = useDebouncedValue(text, 300);

  const q = debouncedText.trim() || undefined;
  const query = useOpportunityFeed({ ...filters, q });
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];

  // ── Tutors + communities (only when the query is the only criterion) ──────
  const searchAll = Boolean(
    q && !filters.type && !filters.mode && !filters.deadlineWithinDays,
  );
  const tutorQuery = useTutorFeed({ q }, { enabled: searchAll });
  const communitiesQuery = useCommunities();
  const savedQuery = useSavedTutorIds({ enabled: Boolean(session) });
  const toggleSave = useToggleSavedTutor();
  const savedIds = new Set(savedQuery.data ?? []);

  const tutorMatches = searchAll
    ? (tutorQuery.data?.pages[0]?.rows ?? [])
    : [];
  const communityMatches = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return (communitiesQuery.data ?? []).filter(
      (community) =>
        community.name.toLowerCase().includes(needle) ||
        (community.description ?? '').toLowerCase().includes(needle) ||
        (community.universityName ?? '').toLowerCase().includes(needle),
    );
  }, [communitiesQuery.data, q]);

  const hasCriteria = Boolean(q || filters.type || filters.mode || filters.deadlineWithinDays);

  // "No matches" may only be claimed once every source has actually answered.
  const everythingEmpty =
    query.isSuccess &&
    rows.length === 0 &&
    (!searchAll ||
      (tutorQuery.isSuccess &&
        tutorMatches.length === 0 &&
        communitiesQuery.isSuccess &&
        communityMatches.length === 0));

  const patchFilters = (patch: Partial<OpportunityFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const clearAll = () => {
    setText('');
    setFilters({});
  };

  return (
    <Screen>
      <BackHeader title="Search" />
      <SearchBar
        value={text}
        onChangeText={setText}
        autoFocus
        placeholder="Search opportunities, tutors, communities…"
      />
      <OpportunityFilterBar filters={filters} onChange={patchFilters} showType />

      {(query.isPending || (searchAll && tutorQuery.isPending)) && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Search failed"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {searchAll && tutorQuery.isError && !query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load tutors"
          message={(tutorQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => tutorQuery.refetch()}
        />
      )}

      {searchAll && tutorMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            compact
            title="Tutors"
            actionLabel="See all"
            onAction={() =>
              router.push({
                pathname: '/(tabs)/explore/tuition',
                params: q ? { q } : {},
              })
            }
          />
          <View style={styles.list}>
            {tutorMatches.slice(0, TUTOR_PREVIEW).map((tutor) => (
              <TutorCard
                key={tutor.id}
                tutor={tutor}
                saved={savedIds.has(tutor.id)}
                onToggleSave={
                  session
                    ? (tutorId) =>
                        toggleSave.mutate({ tutorId, saved: savedIds.has(tutorId) })
                    : undefined
                }
              />
            ))}
          </View>
        </View>
      )}

      {searchAll && communityMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeader compact title="Communities" />
          <View style={styles.grid}>
            {communityMatches.slice(0, COMMUNITY_PREVIEW).map((community) => (
              <View key={community.id} style={styles.gridCell}>
                <CommunityTileCard community={community} />
              </View>
            ))}
          </View>
        </View>
      )}

      {rows.length > 0 && (
        <>
          {searchAll && <SectionHeader compact title="Opportunities" />}
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {rows.length}
              {query.hasNextPage ? '+' : ''} {rows.length === 1 ? 'opportunity' : 'opportunities'}
            </ThemedText>
            {query.isFetching && !query.isFetchingNextPage && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
          <View style={styles.list}>
            {rows.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} showType />
            ))}
          </View>
        </>
      )}

      {query.hasNextPage && (
        <PrimaryButton
          label={query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          loading={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
        />
      )}

      {everythingEmpty && (
        <EmptyState
          icon="search-outline"
          title={hasCriteria ? 'No matches found' : 'Nothing published yet'}
          message={
            hasCriteria
              ? 'Try a different keyword or loosen the filters.'
              : 'Verified listings are on their way — check back soon.'
          }
          actionLabel={hasCriteria ? 'Clear search' : 'Explore categories'}
          onAction={hasCriteria ? clearAll : () => router.push('/(tabs)/explore')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  metaRow: {
    minHeight: Spacing.four,
    justifyContent: 'center',
  },
  list: {
    gap: Spacing.two + 2,
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
});
