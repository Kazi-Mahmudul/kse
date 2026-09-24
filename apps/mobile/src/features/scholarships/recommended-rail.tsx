import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ScholarshipCard } from '@/features/opportunities/components/scholarship-card';
import type { OpportunitySummary } from '@kse/types';
import { useScholarshipMatcher } from '@/features/scholarships/matching-orchestrator';
import { useTheme } from '@/hooks/use-theme';

interface RecommendedRailProps {
  /** All scholarships loaded on the Hub. We match against the same list
   *  so no extra fetch is needed. */
  items: OpportunitySummary[];
}

/**
 * "Recommended for you" rail rendered above the Scholarship Hub list. Uses
 * the rule-based matcher to bucket every loaded scholarship, then shows the
 * top-N "highly_matched" + "eligible" rows. Empty until matching resolves,
 * in which case it renders nothing rather than a half-empty header.
 */
export function RecommendedRail({ items }: RecommendedRailProps) {
  const colors = useTheme();
  const opportunityIds = useMemo(() => items.map((row) => row.id), [items]);
  const { matches, isLoading } = useScholarshipMatcher({ opportunityIds });

  const recommended = useMemo(() => {
    if (!matches.length) return [];
    const verdictById = new Map(matches.map((row) => [row.opportunity_id, row.level]));
    return items
      .map((row) => ({ row, level: verdictById.get(row.id) ?? null }))
      .filter((entry) => entry.level === 'highly_matched' || entry.level === 'eligible')
      .slice(0, 8);
  }, [items, matches]);

  if (isLoading) {
    return (
      <View style={styles.loaderRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
          Finding scholarships that match your profile…
        </Text>
      </View>
    );
  }

  if (recommended.length === 0) {
    return (
      <Pressable
        onPress={() => router.push('/(tabs)/profile/edit')}
        accessibilityRole="button"
        accessibilityLabel="Complete your profile to unlock recommendations"
        style={({ pressed }) => [
          styles.emptyCard,
          { borderColor: colors.border, backgroundColor: colors.backgroundElement },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          Complete your profile to unlock personalised recommendations.
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" style={styles.title}>
        Recommended for you
      </ThemedText>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={recommended}
        keyExtractor={({ row }) => row.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ScholarshipCard opportunity={item.row} matchLevel={item.level} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  title: {
    marginBottom: 2,
  },
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
