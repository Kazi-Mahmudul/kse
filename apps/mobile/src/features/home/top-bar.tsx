import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FALLBACK_LOCATION = 'Khulna, Bangladesh';

interface HomeTopBarProps {
  /** Student's university location; falls back to the platform's home city. */
  location?: string | null;
  unreadCount: number;
}

/**
 * Home top bar (design 03._home_kse): location selector on the left, ringed
 * notification bell with an unread dot on the right.
 */
export function HomeTopBar({ location, unreadCount }: HomeTopBarProps) {
  const colors = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push('/(tabs)/profile/edit')}
        accessibilityRole="button"
        accessibilityLabel={`Location: ${location ?? FALLBACK_LOCATION}. Change your university`}
        style={({ pressed }) => [styles.location, pressed && styles.pressed]}
      >
        <Ionicons name="location" size={16} color={colors.primary} />
        <ThemedText themeColor="bodyStrong" style={styles.locationText} numberOfLines={1}>
          {location ?? FALLBACK_LOCATION}
        </ThemedText>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/(tabs)/notifications')}
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        style={({ pressed }) => [
          styles.bell,
          { borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.bodyStrong} />
        {unreadCount > 0 && (
          <View
            style={[
              styles.dot,
              { backgroundColor: colors.danger, borderColor: colors.background },
            ]}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  locationText: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
