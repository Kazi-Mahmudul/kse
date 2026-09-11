import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SegmentedOption<T extends string> {
  /** Stable identifier; passed back to `onChange`. */
  value: T;
  /** Short label rendered inside the segment. */
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * iOS-style segmented control used for the Settings theme toggle
 * (System / Light / Dark). The active segment is filled with the screen
 * surface colour and lifted with a soft shadow; inactive segments are flat
 * on the muted track.
 *
 * Generic over `T extends string` so other future tri-state pickers
 * (e.g. notification cadence) can reuse this without stringly-typed props.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
      accessibilityRole="radiogroup"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => [
              styles.segment,
              isActive && {
                backgroundColor: colors.background,
                borderColor: colors.border,
                boxShadow: `0px 1px 4px ${colors.shadow}`,
              },
              pressed && !isActive && styles.pressed,
            ]}
          >
            <ThemedText
              style={[
                styles.label,
                { color: isActive ? colors.primary : colors.textMuted },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
