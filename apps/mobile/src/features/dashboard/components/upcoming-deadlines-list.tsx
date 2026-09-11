import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { FontFamilies } from '@/constants/theme';
import { useSavedOpportunities } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import type { IconName } from '@/types/icon';
import { deadlineTone, formatDate } from '@/lib/dates';
import type { OpportunitySummary, OpportunityType } from '@kse/types';

/** Number of rows to show on the dashboard — the rest live on the Saved tab. */
const ROW_LIMIT = 3;

/**
 * Maps each published opportunity type to its dashboard badge tint and
 * fallback icon. Kept in sync with `opportunity-overview-grid.tsx` so the
 * deadlines list and the stat grid agree on what "blue" or "purple" means.
 */
const BADGE: Record<
  OpportunityType,
  { tint: 'indigo' | 'amber' | 'emerald' | 'fuchsia' | 'teal'; icon: IconName }
> = {
  internship: { tint: 'indigo', icon: 'briefcase-outline' },
  scholarship: { tint: 'amber', icon: 'school-outline' },
  workshop: { tint: 'emerald', icon: 'desktop-outline' },
  event: { tint: 'fuchsia', icon: 'calendar-outline' },
  mentorship: { tint: 'teal', icon: 'person-outline' },
};

/**
 * "Upcoming Deadlines" section (design 04._dashboard_kse). Surfaces the
 * student's next three saved deadlines, sorted ASC, omitting expired rows.
 * Falls back to a friendly empty/error state when the saved list is empty
 * or unreachable.
 */
export function UpcomingDeadlinesList() {
  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Upcoming Deadlines"
        actionLabel="See All"
        onAction={() => router.push('/(tabs)/saved')}
      />
      <UpcomingDeadlinesBody />
    </View>
  );
}

function UpcomingDeadlinesBody() {
  const savedQuery = useSavedOpportunities();

  if (savedQuery.isPending) return null;

  if (savedQuery.isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Could not load deadlines"
        message={(savedQuery.error as Error).message}
        actionLabel="Try again"
        onAction={() => savedQuery.refetch()}
      />
    );
  }

  const upcoming = (savedQuery.data ?? [])
    .map((row) => row.opportunity)
    .filter((o) => o.deadline && deadlineTone(o.deadline) !== 'danger')
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, ROW_LIMIT);

  if (upcoming.length === 0) {
    return (
      <EmptyState
        icon="time-outline"
        title="No deadlines to track"
        message="Bookmark opportunities and their deadlines will show up here."
        actionLabel="Explore opportunities"
        onAction={() => router.push('/(tabs)/explore')}
      />
    );
  }

  return (
    <View style={styles.list}>
      {upcoming.map((opportunity) => (
        <DeadlineRow key={opportunity.id} opportunity={opportunity} />
      ))}
    </View>
  );
}

function DeadlineRow({ opportunity }: { opportunity: OpportunitySummary }) {
  const colors = useTheme();
  const tints = useTints();
  const { tint, icon } = BADGE[opportunity.type] ?? BADGE.event;
  const palette = tints[tint];

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: opportunity.type, id: opportunity.id },
    });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${opportunity.title}, deadline ${formatDate(opportunity.deadline)}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.background, borderColor: colors.border, boxShadow: `0px 1px 4px ${colors.shadow}` },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={22} color={palette.fg} />
        </View>
        <View style={styles.text}>
          <ThemedText themeColor="heading" style={styles.title} numberOfLines={1}>
            {opportunity.title}
          </ThemedText>
          <ThemedText themeColor="textMuted" style={styles.date}>
            {formatDate(opportunity.deadline)}
          </ThemedText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  date: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
