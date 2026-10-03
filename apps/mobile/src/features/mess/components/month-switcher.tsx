import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MonthSwitcherProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** Hide the forward arrow when at the current month. */
  nextDisabled?: boolean;
}

/** ‹ September 2026 › month navigation header for calendar screens. */
export function MonthSwitcher({ label, onPrev, onNext, nextDisabled }: MonthSwitcherProps) {
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <ArrowButton name="chevron-back" onPress={onPrev} />
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      {nextDisabled ? (
        <View style={styles.arrowPlaceholder} />
      ) : (
        <ArrowButton name="chevron-forward" onPress={onNext} />
      )}
    </View>
  );

  function ArrowButton({ name, onPress }: { name: 'chevron-back' | 'chevron-forward'; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={name === 'chevron-back' ? 'Previous month' : 'Next month'}
        style={({ pressed }) => [styles.arrow, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}
      >
        <Ionicons name={name} size={18} color={colors.text} />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPlaceholder: {
    width: 36,
    height: 36,
  },
  pressed: {
    opacity: 0.7,
  },
});
