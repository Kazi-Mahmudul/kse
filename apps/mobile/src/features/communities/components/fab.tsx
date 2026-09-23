import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Floating "+" action button for the community surfaces (spec §UI). Renders
 * above the tab bar inside a Screen — the caller passes the actions sheet.
 */
export function CommunityFab({ onPress }: { onPress: () => void }) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create in community"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.primary,
          boxShadow: `0px 6px 16px ${colors.primary}66`,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="add" size={26} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.four,
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 10,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
