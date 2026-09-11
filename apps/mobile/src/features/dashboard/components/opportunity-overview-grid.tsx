import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies } from '@/constants/theme';
import { useOpportunityCountsByType } from '@/features/opportunities/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';
import type { OpportunityType } from '@kse/types';

interface OverviewCardSpec {
  type: OpportunityType;
  label: string;
  trailing: string;
  icon: IconName;
  tint: 'indigo' | 'amber' | 'emerald' | 'fuchsia';
}

const OVERVIEW_CARDS: readonly OverviewCardSpec[] = [
  {
    type: 'internship',
    label: 'Internships',
    trailing: 'New',
    icon: 'briefcase-outline',
    tint: 'indigo',
  },
  {
    type: 'scholarship',
    label: 'Scholarships',
    trailing: 'New',
    icon: 'school-outline',
    tint: 'amber',
  },
  {
    type: 'workshop',
    label: 'Workshops',
    trailing: 'This Week',
    icon: 'desktop-outline',
    tint: 'emerald',
  },
  {
    type: 'event',
    label: 'Events',
    trailing: 'Upcoming',
    icon: 'calendar-outline',
    tint: 'fuchsia',
  },
] as const;

/**
 * "Opportunity Overview" 2×2 grid (design 04._dashboard_kse). Each card
 * shows a category label, a pastel icon pill, the live count of published
 * opportunities of that type, and a small trailing hint. Pressing any card
 * deep-links into the matching Explore section.
 */
export function OpportunityOverviewGrid() {
  const colors = useTheme();
  const tints = useTints();
  const countsQuery = useOpportunityCountsByType();
  const counts = countsQuery.data;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Opportunity Overview" />

      <View style={styles.grid}>
        {OVERVIEW_CARDS.map((card) => {
          const tint = tints[card.tint];
          const value = counts?.[card.type];
          return (
            <Pressable
              key={card.type}
              onPress={() => router.push(`/(tabs)/explore/${card.type}`)}
              accessibilityRole="button"
              accessibilityLabel={`${card.label}: ${value ?? 0} ${card.trailing.toLowerCase()}`}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.background, borderColor: colors.border, boxShadow: `0px 2px 8px ${colors.shadow}` },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.topRow}>
                <ThemedText themeColor="textSecondary" style={styles.label}>
                  {card.label}
                </ThemedText>
                <View
                  style={[
                    styles.iconPill,
                    { backgroundColor: tint.bg },
                  ]}
                >
                  <Ionicons name={card.icon} size={16} color={tint.fg} />
                </View>
              </View>

              <View style={styles.bottomRow}>
                <ThemedText themeColor="heading" style={styles.value}>
                  {value == null ? '—' : value}
                </ThemedText>
                <ThemedText themeColor="textMuted" style={styles.trailing}>
                  {card.trailing}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    rowGap: 12,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    height: 104,
    flexDirection: 'column',
    justifyContent: 'space-between',
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  label: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  trailing: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
  },
});
