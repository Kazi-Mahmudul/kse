import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  SCHOLARSHIP_APPLICATION_STATUS_LABELS,
  SCHOLARSHIP_APPLICATION_STATUSES,
} from '@kse/shared';
import { supabase } from '@/lib/supabase';
import type {
  OpportunitySummary,
  ScholarshipApplication,
  ScholarshipApplicationStatus,
} from '@kse/types';

import { useMyApplications } from '@/features/scholarships/queries';

/**
 * Scholarship application tracker (spec §16): a grouped-by-status view
 * of every `scholarship_applications` row for the current user, with
 * opportunity metadata fetched alongside so each card shows the title,
 * deadline and provider without an extra round-trip per row.
 */
export default function ScholarshipTrackerScreen() {
  const colors = useTheme();
  const applicationsQuery = useMyApplications();

  const applications = useMemo(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data],
  );
  const opportunityIds = useMemo(
    () => Array.from(new Set(applications.map((row) => row.opportunity_id))),
    [applications],
  );

  const opportunityById = useOpportunityLookup(opportunityIds);

  const grouped = useMemo(() => groupByStatus(applications), [applications]);

  if (applicationsQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen scroll={false} style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Screen>
      </>
    );
  }

  if (applicationsQuery.isError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen scroll={false}>
          <BackHeader title="Applications" />
          <EmptyState
            icon="cloud-offline-outline"
            title="Could not load your applications"
            message={(applicationsQuery.error as Error).message}
            actionLabel="Try again"
            onAction={() => applicationsQuery.refetch()}
          />
        </Screen>
      </>
    );
  }

  if (applications.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen>
          <BackHeader title="Applications" />
          <EmptyState
            icon="bookmark-outline"
            title="No tracked scholarships yet"
            message="Open a scholarship and tap ‘Add to application tracker’ to keep tabs on what you're applying to."
            actionLabel="Browse scholarships"
            onAction={() => router.push('/(tabs)/explore/scholarship')}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <BackHeader title="Applications" />
        <FlatList
          data={SCHOLARSHIP_APPLICATION_STATUSES}
          keyExtractor={(status) => status}
          renderItem={({ item: status }) => {
            const rows = grouped[status] ?? [];
            if (rows.length === 0) return null;
            return (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">
                    {SCHOLARSHIP_APPLICATION_STATUS_LABELS[status]}
                  </ThemedText>
                  <Chip label={`${rows.length}`} />
                </View>
                <View style={styles.cardList}>
                  {rows.map((application) => (
                    <TrackerCard
                      key={application.id}
                      application={application}
                      opportunity={opportunityById.get(application.opportunity_id) ?? null}
                    />
                  ))}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      </Screen>
    </>
  );
}

function TrackerCard({
  application,
  opportunity,
}: {
  application: ScholarshipApplication;
  opportunity: OpportunitySummary | null;
}) {
  const colors = useTheme();
  const title = opportunity?.title ?? 'Scholarship';
  const provider = opportunity?.organization_name ?? 'Unknown provider';
  const deadline = opportunity?.deadline ?? null;
  const deadlineLabel = useMemo(() => formatDeadline(deadline), [deadline]);

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: 'scholarship', id: application.opportunity_id },
    });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${SCHOLARSHIP_APPLICATION_STATUS_LABELS[application.status]}`}
      style={({ pressed }) => [
        styles.trackerCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.trackerCardHeader}>
        <Ionicons name="school-outline" size={18} color={colors.primary} />
        <View style={styles.trackerCardBody}>
          <Text style={[styles.trackerCardTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.trackerCardProvider, { color: colors.textSecondary }]} numberOfLines={1}>
            {provider}
          </Text>
          <View style={styles.trackerCardMeta}>
            <Chip label={SCHOLARSHIP_APPLICATION_STATUS_LABELS[application.status]} />
            {deadlineLabel ? (
              <Text style={[styles.trackerCardDeadline, { color: colors.textSecondary }]}>
                Deadline: {deadlineLabel}
              </Text>
            ) : null}
          </View>
          {application.notes ? (
            <Card tint="backgroundElement" style={styles.notesCard}>
              <Text style={[styles.notes, { color: colors.text }]} numberOfLines={3}>
                {application.notes}
              </Text>
            </Card>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Resolve opportunity summaries for the tracked applications. Returns a
 *  Map so the FlatList render above stays O(1) per card. Empty Map if the
 *  query has no IDs yet. */
function useOpportunityLookup(opportunityIds: readonly string[]) {
  const debounced = useDebouncedValue(opportunityIds, 100);
  return useQuery({
    queryKey: ['scholarship-tracker', 'opportunities', debounced] as const,
    enabled: debounced.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(
          'id, type, title, organization_name, summary, image_url, location, opportunity_mode, deadline, featured, verified, stipend_amount, stipend_currency, internship_type, degree_level, funding_type, country, event_type, starts_at',
        )
        .in('id', [...debounced]);
      if (error) throw error;
      const map = new Map<string, OpportunitySummary>();
      for (const row of (data ?? []) as OpportunitySummary[]) {
        map.set(row.id, row);
      }
      return map;
    },
  }).data ?? new Map<string, OpportunitySummary>();
}

function groupByStatus(rows: ScholarshipApplication[]): Record<ScholarshipApplicationStatus, ScholarshipApplication[]> {
  const empty: Record<ScholarshipApplicationStatus, ScholarshipApplication[]> = {
    saved: [],
    interested: [],
    preparing: [],
    applied: [],
    rejected: [],
    selected: [],
  };
  for (const row of rows) empty[row.status].push(row);
  return empty;
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(deadline));
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  cardList: {
    gap: Spacing.two,
  },
  trackerCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  trackerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  trackerCardBody: {
    flex: 1,
    gap: 4,
  },
  trackerCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trackerCardProvider: {
    fontSize: 12,
    fontWeight: '500',
  },
  trackerCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 4,
  },
  trackerCardDeadline: {
    fontSize: 11,
    fontWeight: '500',
  },
  notesCard: {
    marginTop: 6,
  },
  notes: {
    fontSize: 12,
    lineHeight: 16,
  },
});
