import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Badge } from '@/components/ui/badge';

/** Community tab — live communities (join, announcements) arrive in step 16. */
export default function CommunityScreen() {
  return (
    <Screen>
      <ThemedText type="subtitle">Community</ThemedText>
      <Badge label="Coming soon" tone="primary" />
      <EmptyState
        icon="people-outline"
        title="No communities to show yet"
        message="Student clubs, study groups and announcements around Khulna will live here."
        actionLabel="Explore opportunities"
        onAction={() => router.push('/(tabs)/explore')}
      />
    </Screen>
  );
}
