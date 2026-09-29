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
import { useCommunitySearch } from '@/features/communities/queries';
import { BookCard } from '@/features/hub/components/book-card';
import { ListingCard } from '@/features/hub/components/listing-card';
import { ResearchCard } from '@/features/hub/components/research-card';
import {
  useBookFeed,
  useHubFeed,
  useResearchFeed,
} from '@/features/hub/queries';
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
const HUB_PREVIEW = 3;
const BOOK_PREVIEW = 3;
const RESEARCH_PREVIEW = 3;

/**
 * Global search (step 9): debounced free-text over everything the platform
 * hosts — opportunities (prefix full-text search), tutors, communities and
 * the Student Hub (places, book exchange, research partners) — plus type /
 * mode / deadline chips fed through the shared opportunity feed.
 *
 * Cross-entity sections only appear while the query is the sole criterion:
 * a type/mode/deadline chip scopes the screen to opportunities, and showing
 * tutors or hub rows that ignore those chips would be misleading.
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

  // ── Tutors + communities + Student Hub (only when the query is the only
  //    criterion — opportunity chips scope the screen to opportunities) ──────
  const searchAll = Boolean(
    q && !filters.type && !filters.mode && !filters.deadlineWithinDays,
  );
  const tutorQuery = useTutorFeed({ q }, { enabled: searchAll });
  // Server-side ilike search; only the first page is needed for the preview.
  const communitiesQuery = useCommunitySearch({ query: q });
  // Student Hub sources — full-text over name/area/services, book titles and
  // research profiles. Disabled until there is a query so opening the screen
  // costs nothing.
  const hubQuery = useHubFeed({ q }, { enabled: searchAll });
  const booksQuery = useBookFeed({ q }, { enabled: searchAll });
  const researchQuery = useResearchFeed({ q }, { enabled: searchAll });
  const savedQuery = useSavedTutorIds({ enabled: Boolean(session) });
  const toggleSave = useToggleSavedTutor();
  const savedIds = new Set(savedQuery.data ?? []);

  const tutorMatches = searchAll
    ? (tutorQuery.data?.pages[0]?.rows ?? [])
    : [];
  const communityMatches = useMemo(
    () => (q ? (communitiesQuery.data?.pages[0]?.items ?? []) : []),
    [communitiesQuery.data, q],
  );
  const hubMatches = searchAll ? (hubQuery.data?.pages[0]?.rows ?? []) : [];
  const bookMatches = searchAll ? (booksQuery.data?.pages[0]?.rows ?? []) : [];
  const researchMatches = searchAll
    ? (researchQuery.data?.pages[0]?.rows ?? [])
    : [];

  const hasCriteria = Boolean(q || filters.type || filters.mode || filters.deadlineWithinDays);

  // "No matches" may only be claimed once every source has actually answered.
  const everythingEmpty =
    query.isSuccess &&
    rows.length === 0 &&
    (!searchAll ||
      (tutorQuery.isSuccess &&
        tutorMatches.length === 0 &&
        communitiesQuery.isSuccess &&
        communityMatches.length === 0 &&
        hubQuery.isSuccess &&
        hubMatches.length === 0 &&
        booksQuery.isSuccess &&
        bookMatches.length === 0 &&
        researchQuery.isSuccess &&
        researchMatches.length === 0));

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
        placeholder="Search opportunities, tutors, places, books…"
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

      {searchAll && hubMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            compact
            title="Student Hub places"
            actionLabel="See all"
            onAction={() =>
              router.push({
                pathname: '/hub/search',
                params: q ? { q } : {},
              })
            }
          />
          <View style={styles.list}>
            {hubMatches.slice(0, HUB_PREVIEW).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </View>
        </View>
      )}

      {searchAll && bookMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            compact
            title="Books"
            actionLabel="See all"
            onAction={() => router.push('/hub/book-exchange')}
          />
          <View style={styles.list}>
            {bookMatches.slice(0, BOOK_PREVIEW).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </View>
        </View>
      )}

      {searchAll && researchMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            compact
            title="Research partners"
            actionLabel="See all"
            onAction={() => router.push('/hub/research')}
          />
          <View style={styles.list}>
            {researchMatches.slice(0, RESEARCH_PREVIEW).map((profile) => (
              <ResearchCard key={profile.id} profile={profile} />
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
