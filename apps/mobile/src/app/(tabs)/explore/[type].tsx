import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { findCategory } from '@/features/explore/categories';
import { useOpportunities } from '@/features/opportunities/queries';
import { useTheme } from '@/hooks/use-theme';
import { OPPORTUNITY_TYPES, type OpportunityType } from '@kse/types';

/** Per-type listing (step 8). Tuition/tutor discovery arrives with step 15. */
export default function ExploreTypeScreen() {
  const colors = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const category = type ? findCategory(type) : undefined;
  const isOpportunityType = OPPORTUNITY_TYPES.includes(type as OpportunityType);

  const query = useOpportunities(type as OpportunityType);
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];

  // Tuition has its own tutors module (step 15) — no opportunity rows.
  if (category && !isOpportunityType) {
    return (
      <Screen>
        <BackHeader title={category.label} />
        <EmptyState
          icon={category.icon}
          title={`${category.label} discovery is coming`}
          message="Tutor profiles, subjects and requests land with the tuition module."
          actionLabel="Back to categories"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title={category?.label ?? 'Explore'} />

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load listings"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={category?.icon ?? 'search-outline'}
          title={`No ${category?.label.toLowerCase() ?? 'listings'} right now`}
          message="New verified listings are added regularly — check back soon."
          actionLabel="Refresh"
          onAction={() => query.refetch()}
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </View>
      )}

      {query.hasNextPage && (
        <PrimaryButton
          label={query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          loading={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  list: {
    gap: Spacing.two + 2,
  },
});
