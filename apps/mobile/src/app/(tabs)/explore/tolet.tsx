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

import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useToletFeed, useToletFacets } from '@/features/tolet/queries';
import { ToletFilterBar } from '@/features/tolet/components/tolet-filter-bar';
import { ToletCard } from '@/features/tolet/components/tolet-card';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';
import type {
  ToletFilters,
  ToletGenderPreference,
  ToletRoomType,
} from '@kse/types';
import { TOLET_GENDER_PREFERENCE_LABELS, TOLET_ROOM_TYPE_LABELS } from '@kse/shared';

/**
 * Bachelor To-Let hub (spec bachelor-to-let §Discovery).
 *
 * Layout:
 *   H1 + back chevron
 *   Search bar (with filter sheet button)
 *   Quick chip row: All / Room type / Gender
 *   Vertical infinite-scroll list of `ToletCard`s
 *
 * Mirrors the Scholarship Hub's pattern (`explore/scholarship.tsx`) — same
 * RN Modal filter sheet, same dedup-friendly infinite query, same filter
 * state separation (chip-driven + free-form facet sheet).
 */
type QuickChip = 'all' | 'bachelor' | 'sublet' | 'female';

const QUICK_CHIPS: { value: QuickChip; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'sublet', label: 'Sublet' },
  { value: 'female', label: 'Girls only' },
];

function chipToFilters(chip: QuickChip): Partial<ToletFilters> {
  switch (chip) {
    case 'bachelor':
      return { roomType: 'shared' satisfies ToletRoomType };
    case 'sublet':
      return { roomType: 'sublet' satisfies ToletRoomType };
    case 'female':
      return { gender: 'female_only' satisfies ToletGenderPreference };
    default:
      return {};
  }
}

export default function ToletHubScreen() {
  const colors = useTheme();
  const [searchText, setSearchText] = useState('');
  const [activeChip, setActiveChip] = useState<QuickChip>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [extraFilters, setExtraFilters] = useState<ToletFilters>({});

  const debouncedSearch = useDebouncedValue(searchText, 300).trim();
  const facetsQuery = useToletFacets();
  const facets = facetsQuery.data;

  const filters = useMemo<ToletFilters>(
    () => ({
      q: debouncedSearch || undefined,
      ...extraFilters,
      ...chipToFilters(activeChip),
    }),
    [debouncedSearch, activeChip, extraFilters],
  );

  const query = useToletFeed(filters);
  const items = query.data?.pages.flatMap((page) => page.rows) ?? [];

  const handleChipPress = useCallback((chip: QuickChip) => setActiveChip(chip), []);

  const handleFilterChange = useCallback((patch: Partial<ToletFilters>) => {
    setExtraFilters((current) => ({ ...current, ...patch }));
  }, []);

  const hasActiveFilters =
    Boolean(extraFilters.city) ||
    Boolean(extraFilters.area) ||
    Boolean(extraFilters.roomType) ||
    Boolean(extraFilters.gender) ||
    Boolean(extraFilters.listingStatus) ||
    Boolean(extraFilters.bachelorFriendly) ||
    Boolean(extraFilters.minRent) ||
    Boolean(extraFilters.maxRent) ||
    Boolean(extraFilters.maxTotalRooms) ||
    Boolean(extraFilters.sort && extraFilters.sort !== 'recent') ||
    Boolean(debouncedSearch) ||
    activeChip !== 'all';

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
          <ThemedText type="title">Bachelor To-Let</ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/explore/tolet/post')}
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Post a listing"
          >
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </Pressable>
        </View>

        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by area, landmark, room type…"
          onFilterPress={() => {
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
          <Chip
            label="My listings"
            selected={false}
            onPress={() => router.push('/(tabs)/explore/tolet/my-listings')}
          />
        </ScrollView>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ToletCard listing={item} />}
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
                icon="home-outline"
                title={hasActiveFilters ? 'No listings match your filters' : 'No listings right now'}
                message={
                  hasActiveFilters
                    ? 'Try a different chip, clear the search, or reset the filter sheet.'
                    : 'Be the first to post a Bachelor To-Let listing for your area.'
                }
                actionLabel={hasActiveFilters ? 'Clear filters' : 'Post a listing'}
                onAction={() => {
                  if (hasActiveFilters) {
                    setActiveChip('all');
                    setExtraFilters({});
                    setSearchText('');
                  } else {
                    router.push('/(tabs)/explore/tolet/post');
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
              { backgroundColor: colors.background, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.sheetHandle} />
            <ThemedText type="subtitle">Filters</ThemedText>
            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
              <ToletFilterBar
                filters={extraFilters}
                onChange={handleFilterChange}
                facets={facets}
              />
            </ScrollView>
            <View style={styles.sheetActions}>
              <PrimaryButton
                label="Reset"
                variant="outline"
                onPress={() => setExtraFilters({})}
              />
              <PrimaryButton
                label="Apply"
                onPress={() => setFilterSheetOpen(false)}
              />
            </View>
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
    justifyContent: 'space-between',
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
    maxHeight: '85%',
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
    maxHeight: 400,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});

// Re-export the type for screens that import from this file.
export type { ToletFilters };
// Surface label maps so detail screens can read them without a second import.
export { TOLET_ROOM_TYPE_LABELS, TOLET_GENDER_PREFERENCE_LABELS };
