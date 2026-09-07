import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { OpportunityFilterBar } from '@/components/opportunity-filter-bar';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Spacing } from '@/constants/theme';
import { useOpportunityFeed } from '@/features/opportunities/queries';
import type { OpportunityFilters } from '@/features/opportunities/service';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

/**
 * Search & filter (step 9): debounced free-text over search_vector plus
 * type / mode / deadline chips, all fed through the shared opportunity feed.
 */
export default function SearchScreen() {
  const colors = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(typeof params.q === 'string' ? params.q : '');
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const debouncedText = useDebouncedValue(text, 300);

  const q = debouncedText.trim() || undefined;
  const query = useOpportunityFeed({ ...filters, q });
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const hasCriteria = Boolean(q || filters.type || filters.mode || filters.deadlineWithinDays);

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
        placeholder="Search by title, company, keyword…"
      />
      <OpportunityFilterBar filters={filters} onChange={patchFilters} showType />

      {query.isPending && (
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

      {query.isSuccess && rows.length === 0 && (
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

      {rows.length > 0 && (
        <>
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {rows.length}+ {rows.length === 1 ? 'opportunity' : 'opportunities'}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  metaRow: {
    minHeight: Spacing.four,
    justifyContent: 'center',
  },
  list: {
    gap: Spacing.two + 2,
  },
});
