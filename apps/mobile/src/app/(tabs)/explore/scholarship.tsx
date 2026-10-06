import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSmartBack } from '@/hooks/use-smart-back';
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
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ScholarshipCard } from '@/features/opportunities/components/scholarship-card';
import { useOpportunityFacets, useOpportunityFeed } from '@/features/opportunities/queries';
import type { OpportunityFilters } from '@/features/opportunities/service';
import { RecommendedRail } from '@/features/scholarships/recommended-rail';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';

/**
 * Quick-filter chip values on the Scholarship Hub (spec 07._scholarship_hub_kse).
 * - `local` → opportunities with `country='Bangladesh'`.
 * - `international` → opportunities whose `country` is anything else.
 */
type QuickChip = 'all' | 'local' | 'international';

const QUICK_CHIPS: { value: QuickChip; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'local', label: 'Local' },
  { value: 'international', label: 'International' },
];

function chipToFilters(chip: QuickChip): Partial<OpportunityFilters> {
  switch (chip) {
    case 'local':
      return { country: 'Bangladesh' };
    case 'international':
      return { countryNot: 'Bangladesh' };
    case 'all':
    default:
      return {};
  }
}

/**
 * Scholarship Hub (spec 07._scholarship_hub_kse):
 *
 *   Search + filter | All / Local / International | vertical list
 *
 * Coexists with `/(tabs)/explore/[type].tsx` — expo-router prefers the
 * static `scholarship` segment over the dynamic `[type]` for the exact
 * `/explore/scholarship` path. Other category tiles (events, workshops,
 * mentorship) still fall through to the dynamic listing.
 */
export default function ScholarshipHubScreen() {
  const colors = useTheme();
  const goBack = useSmartBack('/(tabs)/explore');
  const [searchText, setSearchText] = useState('');
  const [activeChip, setActiveChip] = useState<QuickChip>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [extraFilters, setExtraFilters] = useState<OpportunityFilters>({});
  const [country, setCountry] = useState<string | undefined>();

  const debouncedSearch = useDebouncedValue(searchText, 300).trim();
  const facetsQuery = useOpportunityFacets('scholarship');
  const countries = facetsQuery.data?.countries ?? [];

  const filters = useMemo<OpportunityFilters>(
    () => ({
      type: 'scholarship',
      q: debouncedSearch || undefined,
      ...extraFilters,
      // A specific country (dropdown) and the Local/International chips
      // both write `country` / `countryNot` — selecting either clears the
      // other, so at most one is active at a time.
      ...(country ? { country } : {}),
      ...chipToFilters(activeChip),
    }),
    [debouncedSearch, activeChip, extraFilters, country],
  );

  const query = useOpportunityFeed(filters);
  const items = query.data?.pages.flatMap((page) => page.rows) ?? [];

  const handleChipPress = useCallback((chip: QuickChip) => {
    setActiveChip(chip);
    // The chip now owns country/countryNot — drop a country picked in the
    // dropdown so the two never fight.
    setCountry(undefined);
  }, []);

  const handleCountrySelect = useCallback((value: string | undefined) => {
    setCountry(value);
    // "Local"/"International" contradict a specific country — reset to All.
    if (value) setActiveChip('all');
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
      extraFilters.deadlineWithinDays ||
      country,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={styles.header}>
          <Pressable
            onPress={() => goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <ThemedText type="title">Scholarship Hub</ThemedText>
        </View>

        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search scholarships..."
          onFilterPress={() => {
            // Drop the filter button's focus before the sheet mounts.
            blurActiveElement();
            setFilterSheetOpen(true);
          }}
        />

        <FilterDropdown
          label="Country"
          allLabel="All countries"
          options={countries.map((name) => ({ value: name, label: name }))}
          selected={country}
          onSelect={handleCountrySelect}
          style={styles.countryDropdown}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroller}
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
          renderItem={({ item }) => <ScholarshipCard opportunity={item} />}
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.recommendedHost}>
                <RecommendedRail items={items} />
              </View>
            ) : null
          }
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
                icon="school-outline"
                title={hasActiveFilters || activeChip !== 'all' || debouncedSearch
                  ? 'No scholarships match your filters'
                  : 'No scholarships right now'}
                message={
                  hasActiveFilters || activeChip !== 'all' || debouncedSearch
                    ? 'Try a different chip, clear the search, or reset the filter sheet.'
                    : 'Verified scholarships are added regularly — check back soon.'
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
                    setCountry(undefined);
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
                showScholarshipFilters
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
  countryDropdown: {
    maxWidth: 260,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
  },
  // react-native-web gives ScrollViews flexGrow:1 — neutralise it so this
  // one-line row can't balloon and push the feed to the bottom.
  chipScroller: {
    flexGrow: 0,
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
  recommendedHost: {
    paddingBottom: Spacing.three,
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
