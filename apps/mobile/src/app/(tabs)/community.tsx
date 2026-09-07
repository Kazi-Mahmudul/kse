import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CommunityCard } from '@/components/community-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useCommunities } from '@/features/communities/queries';
import { useTheme } from '@/hooks/use-theme';

/** Community tab (step 16): discovery + membership toggle, no messaging. */
export default function CommunityScreen() {
  const colors = useTheme();
  const query = useCommunities();
  const rows = query.data ?? [];

  return (
    <Screen>
      <ThemedText type="subtitle">Community</ThemedText>

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load communities"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon="people-outline"
          title="No communities yet"
          message="Verified communities around Khulna universities will appear here."
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((community) => (
            <CommunityCard key={community.id} community={community} />
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
