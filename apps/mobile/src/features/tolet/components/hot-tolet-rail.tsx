import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { ToletCard } from '@/features/tolet/components/tolet-card';
import { useHotToletListings } from '@/features/tolet/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * "Hot To-Lets" rail rendered on the Home screen. Mirrors the
 * `RecommendedRail` pattern: horizontal scroll of `ToletCard`s sourced from
 * `opportunities where type='tolet' AND featured=true`. The query lives in
 * `useHotToletListings`; admin staff mark listings as featured via the
 * existing `opportunities.featured` toggle.
 *
 * Renders nothing while loading (the rest of the home page keeps painting),
 * an EmptyState when nothing is flagged featured, and the rail when we have
 * cards to show.
 */
export function HotToletRail({ limit = 6 }: { limit?: number }) {
  const colors = useTheme();
  const query = useHotToletListings(limit);
  const listings = query.data ?? [];

  if (query.isPending) {
    return (
      <View style={styles.loaderRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
          Loading hot to-lets…
        </Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Could not load hot to-lets"
        message={(query.error as Error).message}
        actionLabel="Try again"
        onAction={() => query.refetch()}
      />
    );
  }

  if (listings.length === 0) {
    return (
      <Pressable
        onPress={() => router.push('/(tabs)/explore/tolet')}
        accessibilityRole="button"
        accessibilityLabel="Browse all Bachelor To-Let listings"
        style={({ pressed }) => [
          styles.emptyCard,
          { borderColor: colors.border, backgroundColor: colors.backgroundElement },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="flame-outline" size={18} color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No hot to-lets right now — browse all Bachelor To-Let listings.
        </Text>
      </Pressable>
    );
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={listings}
      keyExtractor={(listing) => listing.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <ToletCard listing={item} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
    paddingRight: Spacing.three,
  },
  cardWrapper: {
    width: 320,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  loaderText: {
    fontSize: 12,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
