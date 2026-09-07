import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing, ThemeColor } from '@/constants/theme';
import { useMyCommunities } from '@/features/dashboard/queries';
import { profileCompletion } from '@/features/profile/completion';
import { useMyProfile, useMySkillIds } from '@/features/profile/queries';
import { useSavedOpportunities } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, deadlineTone, formatDate } from '@/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import type { OpportunitySummary } from '@kse/types';

/**
 * Dashboard (spec §6): profile completion, saved opportunities, upcoming
 * deadlines from bookmarks, and joined communities. Applications and
 * achievements arrive with later roadmap steps.
 */
export default function DashboardScreen() {
  const colors = useTheme();
  const session = useAuthStore((s) => s.session);
  const profileQuery = useMyProfile();
  const skillIdsQuery = useMySkillIds();
  const savedQuery = useSavedOpportunities();
  const communitiesQuery = useMyCommunities();

  if (profileQuery.isPending) {
    return (
      <Screen scroll={false} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen scroll={false}>
        <BackHeader title="Dashboard" />
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your dashboard"
          message={(profileQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => profileQuery.refetch()}
        />
      </Screen>
    );
  }

  const firstName =
    (session?.user.user_metadata?.full_name as string | undefined ?? '')
      .trim()
      .split(/\s+/)[0] || session?.user.email?.split('@')[0] || 'there';

  const completion = profileCompletion(
    profileQuery.data,
    (skillIdsQuery.data ?? []).length,
  );

  const saved = (savedQuery.data ?? []).map((row) => row.opportunity);
  const upcoming = saved
    .filter((o) => o.deadline && deadlineTone(o.deadline) !== 'danger')
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, 5);
  const communities = communitiesQuery.data ?? [];

  return (
    <Screen>
      <BackHeader title="Dashboard" />

      <View style={styles.grid}>
        <StatCard
          icon="person-outline"
          tint="primary"
          value={`${completion}%`}
          label="Profile complete"
          onPress={() => router.push('/(tabs)/profile/edit')}
        />
        <StatCard
          icon="bookmark-outline"
          tint="success"
          value={String(saved.length)}
          label="Saved"
          onPress={() => router.push('/(tabs)/saved')}
        />
        <StatCard
          icon="time-outline"
          tint="warning"
          value={String(upcoming.length)}
          label="Deadlines ahead"
          onPress={() => router.push('/(tabs)/saved')}
        />
        <StatCard
          icon="people-outline"
          tint="danger"
          value={String(communities.length)}
          label="Communities"
          onPress={() => router.push('/(tabs)/community')}
        />
      </View>

      <Card>
        <View style={styles.completionHeader}>
          <View>
            <ThemedText type="smallBold">Hi {firstName}, your profile is {completion}% complete</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              A complete profile means better matches later.
            </ThemedText>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
          <View
            style={[styles.progressFill, { backgroundColor: colors.primary, width: `${completion}%` }]}
          />
        </View>
        {completion < 100 && (
          <PrimaryButton
            label="Complete my profile"
            onPress={() => router.push('/(tabs)/profile/edit')}
            style={styles.completionButton}
          />
        )}
      </Card>

      <SectionHeader
        title="Upcoming deadlines"
        actionLabel="Saved"
        onAction={() => router.push('/(tabs)/saved')}
      />
      {savedQuery.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load deadlines"
          message={(savedQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => savedQuery.refetch()}
        />
      )}
      {savedQuery.isSuccess && upcoming.length === 0 && (
        <EmptyState
          icon="time-outline"
          title="No deadlines to track"
          message="Bookmark opportunities and their deadlines will show up here."
          actionLabel="Explore opportunities"
          onAction={() => router.push('/(tabs)/explore')}
        />
      )}
      {upcoming.length > 0 && (
        <View style={styles.deadlineList}>
          {upcoming.map((opportunity) => (
            <DeadlineRow key={opportunity.id} opportunity={opportunity} />
          ))}
        </View>
      )}

      <SectionHeader title="Your communities" />
      {communitiesQuery.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load communities"
          message={(communitiesQuery.error as Error).message}
          actionLabel="Try again"
          onAction={() => communitiesQuery.refetch()}
        />
      )}
      {communitiesQuery.isSuccess && communities.length === 0 && (
        <EmptyState
          icon="people-outline"
          title="No communities yet"
          message="Join a student club or study group to see it here."
          actionLabel="Browse communities"
          onAction={() => router.push('/(tabs)/community')}
        />
      )}
      {communities.length > 0 && (
        <View style={styles.chips}>
          {communities.slice(0, 6).map((community) => (
            <Chip key={community.id} label={community.name} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function StatCard({
  icon,
  tint,
  value,
  label,
  onPress,
}: {
  icon: 'person-outline' | 'bookmark-outline' | 'time-outline' | 'people-outline';
  tint: ThemeColor;
  value: string;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  const color = colors[tint];

  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

function DeadlineRow({ opportunity }: { opportunity: OpportunitySummary }) {
  const colors = useTheme();
  const tone = deadlineTone(opportunity.deadline);

  const open = () =>
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { type: opportunity.type, id: opportunity.id },
    });

  return (
    <Card onPress={open} style={styles.deadlineRow}>
      <View style={styles.deadlineText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {opportunity.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {opportunity.organization_name}
        </ThemedText>
      </View>
      <View style={styles.deadlineMeta}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(opportunity.deadline)}
        </ThemedText>
        <Badge
          label={deadlineLabel(opportunity.deadline)}
          tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'neutral'}
        />
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: Spacing.one + 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionHeader: {
    gap: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: Spacing.three,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  completionButton: {
    marginTop: Spacing.three,
  },
  deadlineList: {
    gap: Spacing.two,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  deadlineText: {
    flex: 1,
    gap: 2,
  },
  deadlineMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
