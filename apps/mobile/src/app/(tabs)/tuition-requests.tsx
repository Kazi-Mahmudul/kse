import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useMyTuitionRequests } from '@/features/tuition/queries';
import { formatDate } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';
import type { TuitionRequestRow, TuitionRequestStatus } from '@kse/types';

const STATUS_TONES: Record<TuitionRequestStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  closed: 'neutral',
};

/** Tuition requests the student sent (step 15) — status inbox, no messaging. */
export default function TuitionRequestsScreen() {
  const colors = useTheme();
  const query = useMyTuitionRequests();
  const rows = query.data ?? [];

  return (
    <Screen>
      <BackHeader title="My tuition requests" />

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load requests"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon="send-outline"
          title="No requests yet"
          message="Find a verified tutor, send a short request and track its status here."
          actionLabel="Browse tutors"
          onAction={() => router.push('/(tabs)/explore/tuition')}
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function RequestCard({ request }: { request: TuitionRequestRow }) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {request.tutorHeadline ?? request.subjectName ?? 'Tuition request'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(request.createdAt)}
            {request.subjectName && request.tutorHeadline
              ? ` · ${request.subjectName}`
              : ''}
          </ThemedText>
        </View>
        <Badge label={request.status} tone={STATUS_TONES[request.status]} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
        {request.message}
      </ThemedText>
      {request.preferredTime && (
        <ThemedText type="small" themeColor="textSecondary">
          Prefers: {request.preferredTime}
        </ThemedText>
      )}
    </Card>
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
  card: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
});
