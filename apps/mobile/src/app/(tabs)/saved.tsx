import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSavedOpportunities } from '@/features/saved/queries';
import { ListingCard } from '@/features/hub/components/listing-card';
import { useSavedHubListings } from '@/features/hub/queries';
import { ToletCard } from '@/features/tolet/components/tolet-card';
import { useTheme } from '@/hooks/use-theme';
import type { ToletListingSummary } from '@kse/types';

/** Saved opportunities + Student Hub places (spec student-hub §24). */
export default function SavedScreen() {
  const colors = useTheme();
  const query = useSavedOpportunities();
  const rows = query.data ?? [];
  const hubQuery = useSavedHubListings();
  const hubRows = hubQuery.data ?? [];

  return (
    <Screen>
      <BackHeader title="Saved" />

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load saved opportunities"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && hubRows.length === 0 && (
        <EmptyState
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Tap the bookmark on any opportunity or Student Hub place to keep it here."
          actionLabel="Explore opportunities"
          onAction={() => router.push('/(tabs)/explore')}
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map(({ opportunity }) =>
            opportunity.type === 'tolet' ? (
              <ToletCard key={opportunity.id} listing={opportunity as ToletListingSummary} />
            ) : (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} showType />
            ),
          )}
        </View>
      )}

      {hubRows.length > 0 ? (
        <View style={styles.hubSection}>
          <ThemedText type="default" style={{ fontWeight: '700', marginBottom: Spacing.two }}>
            Student Hub places
          </ThemedText>
          <View style={styles.list}>
            {hubRows.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </View>
        </View>
      ) : null}
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
  hubSection: {
    marginTop: Spacing.three,
  },
});
