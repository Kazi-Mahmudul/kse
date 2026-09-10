import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Dense variant used by the Home layout (design 03._home_kse): 12px bold
   * title, 11px action, no chevron.
   */
  compact?: boolean;
}

/** Section title with an optional right-aligned action ("See All"). */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  compact = false,
}: SectionHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.row}>
      {compact ? (
        <ThemedText themeColor="heading" style={styles.compactTitle}>
          {title}
        </ThemedText>
      ) : (
        <ThemedText type="subtitle">{title}</ThemedText>
      )}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {compact ? (
            <ThemedText themeColor="primary" style={styles.compactAction}>
              {actionLabel}
            </ThemedText>
          ) : (
            <View style={styles.action}>
              <ThemedText type="link" themeColor="primary">
                {actionLabel}
              </ThemedText>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  compactAction: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.7,
  },
});
