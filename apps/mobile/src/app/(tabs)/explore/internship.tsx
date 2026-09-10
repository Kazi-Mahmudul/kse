import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { OpportunityFilterBar } from '@/components/opportunity-filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { InternshipCard } from '@/features/opportunities/components/internship-card';
import { useOpportunityFeed } from '@/features/opportunities/queries';
import type { OpportunityFilters } from '@/features/opportunities/service';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import type { OpportunityInternshipType } from '@kse/types';

/** Quick-filter chip values on the Internship Hub (spec 06._internship_hub_kse). */
type QuickChip = 'all' | 'onsite' | 'remote' | 'part_time';

const QUICK_CHIPS: { value: QuickChip; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'part_time', label: 'Part-time' },
];

function chipToFilters(chip: QuickChip): Partial<OpportunityFilters> {
  switch (chip) {
    case 'onsite':
      return { mode: 'onsite' };
    case 'remote':
      return { mode: 'remote' };
    case 'part_time':
      return { internshipType: 'part_time' as OpportunityInternshipType };
    case 'all':
    default:
      return {};
  }
}

/**
 * Internship Hub (spec 06._internship_hub_kse):
 *
 *   Search + filter | All / On-site / Remote / Part-time | vertical list
 *
 * Coexists with `/(tabs)/explore/[type].tsx` — expo-router prefers the
 * static `internship` segment over the dynamic `[type]` for the exact
 * `/explore/internship` path. Other category tiles (scholarships, events,
 * workshops) still fall through to the dynamic listing.
 */
export default function InternshipHubScreen() {
  const colors = useTheme();
  const [searchText, setSearchText] = useState('');
  const [activeChip, setActiveChip] = useState<QuickChip>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [extraFilters, setExtraFilters] = useState<OpportunityFilters>({});

  const debouncedSearch = useDebouncedValue(searchText, 300).trim();

  const filters = useMemo<OpportunityFilters>(
    () => ({
      type: 'internship',
      q: debouncedSearch || undefined,
      ...chipToFilters(activeChip),
      ...extraFilters,
    }),
    [debouncedSearch, activeChip, extraFilters],
  );

  const query = useOpportunityFeed(filters);
  const items = query.data?.pages.flatMap((page) => page.rows) ?? [];

  const handleChipPress = useCallback((chip: QuickChip) => {
    setActiveChip(chip);
    // Reset extras that would conflict with the new quick chip — otherwise
    // stale `mode` from the filter sheet could keep us on the old mode.
    setExtraFilters((current) => ({
      ...current,
      mode: undefined,
      internshipType: undefined,
    }));
  }, []);

  const handleFilterChange = useCallback((patch: Partial<OpportunityFilters>) => {
    setExtraFilters((current) => ({ ...current, ...patch }));
  }, []);

  const hasActiveFilters = Boolean(
    extraFilters.categoryId ||
      extraFilters.degreeLevel ||
      extraFilters.fundingType ||
      extraFilters.location ||
      extraFilters.organization ||
      extraFilters.deadlineWithinDays,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <ThemedText type="title">Internship Hub</ThemedText>
        </View>

        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search internships..."
          onFilterPress={() => setFilterSheetOpen(true)}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {QUICK_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              label={chip.label}
              selected={activeChip === chip.value}
              onPress={() => handleChipPress(chip.value)}
            />
          ))}
        </ScrollView>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InternshipCard opportunity={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            query.isSuccess ? (
              <EmptyState
                icon="briefcase-outline"
                title={hasActiveFilters || activeChip !== 'all' || debouncedSearch
                  ? 'No internships match your filters'
                  : 'No internships right now'}
                message={
                  hasActiveFilters || activeChip !== 'all' || debouncedSearch
                    ? 'Try a different chip, clear the search, or reset the filter sheet.'
                    : 'Verified internships are added regularly — check back soon.'
                }
                actionLabel={
                  hasActiveFilters || activeChip !== 'all' || debouncedSearch
                    ? 'Clear filters'
                    : 'Refresh'
                }
                onAction={() => {
                  if (hasActiveFilters || activeChip !== 'all' || debouncedSearch) {
                    setActiveChip('all');
                    setExtraFilters({});
                    setSearchText('');
                  } else {
                    query.refetch();
                  }
                }}
              />
            ) : null
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : query.hasNextPage && items.length > 0 ? (
              <PrimaryButton
                label="Load more"
                variant="outline"
                onPress={() => query.fetchNextPage()}
              />
            ) : null
          }
        />

        <Modal
          visible={filterSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setFilterSheetOpen(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setFilterSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <ThemedText type="subtitle">Filters</ThemedText>
            <View style={styles.sheetBody}>
              <OpportunityFilterBar
                filters={extraFilters}
                onChange={handleFilterChange}
                showInternshipFilters
              />
            </View>
            <PrimaryButton
              label="Apply"
              onPress={() => setFilterSheetOpen(false)}
            />
          </View>
        </Modal>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  separator: {
    height: Spacing.three,
  },
  footerLoader: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(120,120,120,0.3)',
  },
  sheetBody: {
    paddingVertical: Spacing.two,
  },
});
