import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSavedOpportunities } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';

/** Saved opportunities (step 10) — newest bookmarks first. */
export default function SavedScreen() {
  const colors = useTheme();
  const query = useSavedOpportunities();
  const rows = query.data ?? [];

  return (
    <Screen>
      <BackHeader title="Saved opportunities" />

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

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Tap the bookmark on any opportunity to keep it here and track its deadline."
          actionLabel="Explore opportunities"
          onAction={() => router.push('/(tabs)/explore')}
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map(({ opportunity }) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} showType />
          ))}
        </View>
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
