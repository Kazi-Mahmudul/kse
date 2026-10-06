import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { MentorCard } from '@/features/mentorship/mentor-card';
import { useOpportunityFeed } from '@/features/opportunities/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

/**
 * Session-format quick filters. The mentor directory is small, so mode
 * filtering happens client-side — "In person" covers both on-site and
 * hybrid mentors (both involve meeting face to face).
 */
type FormatChip = 'all' | 'remote' | 'in_person';

const FORMAT_CHIPS: { value: FormatChip; label: string }[] = [
  { value: 'all', label: 'All mentors' },
  { value: 'remote', label: 'Remote' },
  { value: 'in_person', label: 'In person' },
];

/**
 * Mentorship directory (`/explore/mentorship`): a curated cohort of mentors
 * — industry practitioners, researchers and teachers offering free 1:1
 * guidance. Static `mentorship` segment wins over the generic `[type]`
 * listing, the same way the Scholarship Hub does.
 */
export default function MentorshipScreen() {
  const colors = useTheme();
  const goBack = useSmartBack('/(tabs)/explore');
  const [searchText, setSearchText] = useState('');
  const [format, setFormat] = useState<FormatChip>('all');

  const debouncedSearch = useDebouncedValue(searchText, 300).trim();
  const query = useOpportunityFeed({
    type: 'mentorship',
    q: debouncedSearch || undefined,
  });
  const all = useMemo(
    () => query.data?.pages.flatMap((page) => page.rows) ?? [],
    [query.data],
  );

  const mentors = useMemo(() => {
    const filtered = all.filter((row) => {
      if (format === 'remote') return row.opportunity_mode === 'remote';
      if (format === 'in_person') {
        return row.opportunity_mode === 'onsite' || row.opportunity_mode === 'hybrid';
      }
      return true;
    });
    // Featured mentors lead the directory; within a group keep server order.
    return [...filtered].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [all, format]);

  const filtering = format !== 'all' || debouncedSearch.length > 0;

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
          <ThemedText type="title">Mentorship</ThemedText>
        </View>

        {/* Hero — introduces the directory with the live mentor count. */}
        <LinearGradient
          // Brand indigo→violet, matching the home hero banners — this is a
          // brand surface, not a theme token (same convention as promo slides).
          colors={['#4F46E5', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="people-circle-outline" size={26} color="#ffffff" />
          </View>
          <View style={styles.heroCopy}>
            <ThemedText themeColor="onPrimary" style={styles.heroTitle} numberOfLines={2}>
              Learn from real practitioners
            </ThemedText>
            <ThemedText style={styles.heroSubtitle} numberOfLines={2}>
              Engineers, designers, researchers and teachers offering free 1:1
              guidance to KSE students.
            </ThemedText>
          </View>
          {!query.isPending ? (
            <View style={styles.heroCount}>
              <ThemedText themeColor="onPrimary" style={styles.heroCountLabel}>
                {all.length}
              </ThemedText>
            </View>
          ) : null}
        </LinearGradient>

        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search mentors by name or expertise..."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroller}
        >
          {FORMAT_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              label={chip.label}
              selected={format === chip.value}
              onPress={() => setFormat(chip.value)}
            />
          ))}
        </ScrollView>

        <FlatList
          data={mentors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MentorCard mentor={item} />}
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
                icon="people-circle-outline"
                title={filtering ? 'No mentors match' : 'No mentors yet'}
                message={
                  filtering
                    ? 'Try a different format chip or clear the search.'
                    : 'Verified mentors are being onboarded — check back soon.'
                }
                actionLabel={filtering ? 'Clear filters' : 'Refresh'}
                onAction={() => {
                  if (filtering) {
                    setFormat('all');
                    setSearchText('');
                  } else {
                    query.refetch();
                  }
                }}
              />
            ) : null
          }
          ListFooterComponent={
            query.isFetching ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : query.hasNextPage && mentors.length > 0 ? (
              <PrimaryButton
                label="Load more"
                variant="outline"
                onPress={() => query.fetchNextPage()}
              />
            ) : null
          }
        />
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 20,
    padding: Spacing.three + 2,
    marginBottom: Spacing.two + 2,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  heroSubtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.85)',
  },
  heroCount: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  heroCountLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
  },
  // react-native-web gives ScrollViews flexGrow:1 — neutralise it so this
  // one-line row can't balloon and push the directory to the bottom.
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
});
