import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { OpportunityType } from '@kse/types';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from '@/features/notifications/queries';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/dates';
import { NOTIFICATION_TYPE_LABELS } from '@kse/shared';

/** In-app notifications inbox (step 17, spec §18). */
export default function NotificationsScreen() {
  const colors = useTheme();
  const query = useMyNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const rows = query.data ?? [];
  const unreadCount = rows.filter((row) => row.readAt == null).length;

  const openNotification = (id: string, opportunityId: string | null, data: Record<string, unknown>) => {
    if (markReadMutation.isPending) return;
    markReadMutation.mutate(id);
    analytics.notificationOpened(id);
    if (!opportunityId) return;
    // notifications.data may carry an `opportunity_type` for type-aware
    // deep linking; fall back to 'event' if not present.
    const fallback: OpportunityType = 'event';
    const rawType = data?.opportunity_type;
    const type: OpportunityType =
      typeof rawType === 'string'
        ? (rawType as OpportunityType)
        : fallback;
    router.push({
      pathname: '/(tabs)/explore/[type]/[id]',
      params: { id: opportunityId, type },
    });
  };

  return (
    <Screen>
      <BackHeader title="Notifications" />
      {unreadCount > 0 && (
        <PrimaryButton
          label={markAllMutation.isPending ? 'Marking…' : 'Mark all read'}
          variant="outline"
          onPress={() => markAllMutation.mutate()}
        />
      )}

      {query.isPending && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {query.isError && (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load notifications"
          message={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      )}

      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon="notifications-outline"
          title="Nothing new here"
          message="You'll see deadline reminders, new matching opportunities and community announcements right here."
        />
      )}

      {rows.length > 0 && (
        <View style={styles.list}>
          {rows.map((notification) => (
            <Card
              key={notification.id}
              style={styles.row}
              onPress={() =>
                openNotification(
                  notification.id,
                  notification.opportunityId,
                  notification.data,
                )
              }
            >
              <View style={styles.headerRow}>
                <Badge label={NOTIFICATION_TYPE_LABELS[notification.type]} tone="primary" />
                {notification.readAt == null && (
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                )}
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.time}
                >
                  {formatDate(notification.createdAt)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{notification.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
                {notification.body}
              </ThemedText>
            </Card>
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
  row: {
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  time: {
    flex: 1,
    textAlign: 'right',
  },
});
