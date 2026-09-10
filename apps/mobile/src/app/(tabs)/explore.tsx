import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { Spacing, ThemeColor } from '@/constants/theme';
import { EXPLORE_CATEGORIES, type ExploreCategory } from '@/features/explore/categories';
import { useOpportunityCountsByType } from '@/features/opportunities/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Explore hub (spec §32, redesigned to match the Internship Hub visual language):
 *
 *   H1 "Explore"  →  Pill search bar  →  vertical list of category rows
 *
 * Each row carries a tinted 44×44 logo badge, label, description, live count
 * ("n live") or "Coming soon", and a chevron-forward. Tapping a row pushes
 * to `/(tabs)/explore/[type]`; expo-router resolves the static `internship`
 * segment first so tapping **Internships** lands on the dedicated Hub.
 */
export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const countsQuery = useOpportunityCountsByType();
  const counts = countsQuery.data;

  return (
    <Screen>
      <ThemedText type="title">Explore</ThemedText>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search opportunities, tutors…"
        onSubmitEditing={() =>
          router.push({
            pathname: '/(tabs)/search',
            params: query.trim() ? { q: query.trim() } : {},
          })
        }
      />

      {EXPLORE_CATEGORIES.length === 0 ? (
        <EmptyState
          icon="grid-outline"
          title="No categories yet"
          message="Discovery sections are being set up — check back soon."
        />
      ) : (
        <View style={styles.list}>
          {EXPLORE_CATEGORIES.map((category) => (
            <CategoryRow
              key={category.slug}
              category={category}
              count={category.countKey ? counts?.[category.countKey] : undefined}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function CategoryRow({
  category,
  count,
}: {
  category: ExploreCategory;
  count: number | undefined;
}) {
  const colors = useTheme();
  const tint = colors[category.tint as ThemeColor];
  // `showLive` covers both resolved and explicit 0 — once the query lands,
  // every type-backed row reports its real number, even if that's zero.
  const showLive = category.countKey !== undefined && count !== undefined;
  // No `countKey` (tuition today) — the row signals it's not an opportunity
  // table — show a static "Coming soon" label so the user has clear intent.
  const showSoon = category.countKey === undefined;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(tabs)/explore/[type]',
          params: { type: category.slug },
        })
      }
      android_ripple={{ color: colors.shadow }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        pressed && { opacity: 0.95 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${category.label} category`}
    >
      <View style={[styles.badge, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={category.icon} size={22} color={tint} />
      </View>

      <View style={styles.body}>
        <ThemedText type="smallBold" themeColor="heading" numberOfLines={1}>
          {category.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {category.description}
        </ThemedText>
      </View>

      <View style={styles.right}>
        {showLive ? (
          <ThemedText type="smallBold" themeColor="primary">
            {count} live
          </ThemedText>
        ) : showSoon ? (
          <ThemedText type="small" themeColor="textMuted">
            Coming soon
          </ThemedText>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    // Subtle elevation matching the rest of the app's card shadow token.
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
});
