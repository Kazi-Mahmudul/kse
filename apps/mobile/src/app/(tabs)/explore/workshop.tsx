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
import { EventCard } from '@/features/opportunities/components/event-card';
import { useOpportunityFeed } from '@/features/opportunities/queries';
import type { OpportunityFilters } from '@/features/opportunities/service';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';
import type { OpportunityMode } from '@kse/types';

/** Quick-filter chip values on the Workshop Hub (spec §32 workshop surface). */
type QuickChip = 'all' | 'remote' | 'onsite' | 'hybrid';

const QUICK_CHIPS: { value: QuickChip; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
];

function chipToFilters(chip: QuickChip): Partial<OpportunityFilters> {
  switch (chip) {
    case 'remote':
      return { mode: 'remote' as OpportunityMode };
    case 'onsite':
      return { mode: 'onsite' as OpportunityMode };
    case 'hybrid':
      return { mode: 'hybrid' as OpportunityMode };
    case 'all':
    default:
      return {};
  }
}

/**
 * Workshop Hub — the dedicated hands-on-skills listing, sharing the hub
 * visual language of the Internship / Scholarship / Events screens:
 *
 *   Search + filter | All / Remote / On-site / Hybrid | session cards
 *
 * Rows are `type='workshop'` opportunities rendered with the event-style
 * card (thumbnail, session date, venue, register) since a workshop is a
 * dated session. Coexists with `/(tabs)/explore/[type].tsx` — expo-router
 * prefers the static `workshop` segment for the exact `/explore/workshop`
 * path. The Events Hub intentionally also includes workshop rows (spec
 * 08._events_kse); this hub is the workshop-first entry point.
 */
export default function WorkshopHubScreen() {
  const colors = useTheme();
  const [searchText, setSearchText] = useState('');
  const [activeChip, setActiveChip] = useState<QuickChip>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [extraFilters, setExtraFilters] = useState<OpportunityFilters>({});

  const debouncedSearch = useDebouncedValue(searchText, 300).trim();

  const filters = useMemo<OpportunityFilters>(
    () => ({
      type: 'workshop',
      q: debouncedSearch || undefined,
      ...extraFilters,
      // `chipToFilters` last so the chip's selection always wins over any
      // stale `mode` left in extraFilters by the filter sheet.
      ...chipToFilters(activeChip),
    }),
    [debouncedSearch, activeChip, extraFilters],
  );

  const query = useOpportunityFeed(filters);
  const items = query.data?.pages.flatMap((page) => page.rows) ?? [];

  const handleChipPress = useCallback((chip: QuickChip) => {
    setActiveChip(chip);
  }, []);

  const handleFilterChange = useCallback((patch: Partial<OpportunityFilters>) => {
    setExtraFilters((current) => ({ ...current, ...patch }));
  }, []);

  const hasActiveFilters = Boolean(
    extraFilters.categoryId ||
      extraFilters.mode ||
      extraFilters.location ||
      extraFilters.organization ||
      extraFilters.deadlineWithinDays,
  );
  const hasCriteria = hasActiveFilters || activeChip !== 'all' || debouncedSearch !== '';

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
          <ThemedText type="title">Workshops</ThemedText>
        </View>

        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search workshops..."
          onFilterPress={() => {
            // Drop the filter button's focus before the sheet mounts.
            blurActiveElement();
            setFilterSheetOpen(true);
          }}
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
          renderItem={({ item }) => <EventCard opportunity={item} detailType="workshop" />}
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
                icon="construct-outline"
                title={hasCriteria ? 'No workshops match your filters' : 'No workshops right now'}
                message={
                  hasCriteria
                    ? 'Try a different chip, clear the search, or reset the filter sheet.'
                    : 'Hands-on sessions are added regularly — check back soon.'
                }
                actionLabel={hasCriteria ? 'Clear filters' : 'Refresh'}
                onAction={() => {
                  if (hasCriteria) {
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
