import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useUnreadNotificationCount } from '@/features/notifications/queries';
import { useTheme } from '@/hooks/use-theme';

/**
 * Dashboard header (design 04._dashboard_kse): "Dashboard" title on the left
 * and a 40×40 white notification bell on the right with the coral unread dot
 * layered on top when there are unread notifications.
 */
export function DashboardHeader() {
  const colors = useTheme();
  const unreadQuery = useUnreadNotificationCount();
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <View style={styles.row}>
      <ThemedText style={styles.title}>Dashboard</ThemedText>

      <Pressable
        onPress={() => router.push('/(tabs)/notifications')}
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      >
        <Ionicons
          name="notifications-outline"
          size={20}
          color={colors.bodyStrong}
        />
        {unreadCount > 0 ? (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: colors.danger,
                borderColor: colors.background,
              },
            ]}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: 'heading',
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'background',
    borderColor: 'border',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
