import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * `pill` (default) is the rounded search field used across Explore/Search.
   * `card` is the Home variant (design 03._home_kse): radius 16, muted fill,
   * hairline border, smaller type.
   */
  variant?: 'pill' | 'card';
  /** When set, renders the trailing filter button beside the field. */
  onFilterPress?: () => void;
}

/** Search field (tokens "Shape"). Debouncing is the caller's job (spec §33). */
export function SearchBar({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder = 'Search opportunities, tutors…',
  autoFocus = false,
  variant = 'pill',
  onFilterPress,
}: SearchBarProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const card = variant === 'card';

  const field = (
    <View
      style={[
        styles.bar,
        card ? styles.barCard : styles.barPill,
        // `flex: 1` only applies inside the filter row; as a standalone child
        // of the screen's column it would stretch the field vertically.
        onFilterPress && styles.flexOne,
        {
          backgroundColor: card
            ? focused
              ? colors.background
              : colors.surfaceMuted
            : colors.backgroundElement,
        },
        card && {
          borderColor: focused ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons
        name="search"
        size={card ? 16 : 18}
        color={card ? colors.textMuted : colors.textSecondary}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={card ? colors.textMuted : colors.textSecondary}
        returnKeyType="search"
        style={[
          styles.input,
          card ? styles.inputCard : styles.inputPill,
          { color: colors.text },
        ]}
      />
    </View>
  );

  if (!onFilterPress) return field;

  return (
    <View style={styles.row}>
      {field}
      <Pressable
        onPress={onFilterPress}
        accessibilityRole="button"
        accessibilityLabel="Filter"
        style={({ pressed }) => [
          styles.filterButton,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="options-outline" size={18} color={colors.bodyStrong} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexOne: {
    flex: 1,
  },
  barPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  barCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  inputPill: {
    fontSize: 15,
  },
  inputCard: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
