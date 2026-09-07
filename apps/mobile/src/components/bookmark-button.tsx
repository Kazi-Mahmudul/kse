import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useSavedOpportunityIds, useToggleSavedOpportunity } from '@/features/saved/queries';
import { useTheme } from '@/hooks/use-theme';

interface BookmarkButtonProps {
  opportunityId: string;
  /** "icon" — compact Pressable for list cards; "button" — outline row for detail. */
  variant?: 'icon' | 'button';
}

/**
 * Bookmark toggle (step 10). State lives in the shared ids Set, so every
 * card and the detail screen stay in sync through one cache entry.
 */
export function BookmarkButton({ opportunityId, variant = 'icon' }: BookmarkButtonProps) {
  const colors = useTheme();
  const idsQuery = useSavedOpportunityIds();
  const toggle = useToggleSavedOpportunity();

  const saved = idsQuery.data?.has(opportunityId) ?? false;
  const label = saved ? 'Saved' : 'Save for later';
  const icon = saved ? 'bookmark' : 'bookmark-outline';
  const tint = saved ? colors.primary : colors.textSecondary;

  const onPress = () =>
    toggle.mutate({ opportunityId, saved: !saved });

  if (variant === 'button') {
    return (
      <Pressable
        onPress={onPress}
        disabled={toggle.isPending}
        style={({ pressed }) => [
          styles.button,
          { borderColor: colors.primary, backgroundColor: saved ? `${colors.primary}1A` : 'transparent' },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={[styles.buttonLabel, { color: colors.primary }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.iconWrap}>
      <Pressable
        onPress={onPress}
        disabled={toggle.isPending}
        hitSlop={8}
        style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={20} color={tint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    minHeight: 50,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconWrap: {
    alignItems: 'flex-end',
  },
  icon: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
