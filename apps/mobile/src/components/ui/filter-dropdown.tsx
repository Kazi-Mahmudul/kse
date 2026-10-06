import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FilterDropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  /** Small caption above/inside the field, e.g. "District". */
  label: string;
  options: FilterDropdownOption[];
  /** Currently selected value — `undefined` means "all" (no filter). */
  selected?: string;
  onSelect: (value: string | undefined) => void;
  /** Text shown when nothing is selected, e.g. "All districts". */
  allLabel?: string;
  /** Flex layout in side-by-side rows. */
  style?: object;
}

/**
 * Compact dropdown filter (hub screens): a pill-style field that opens a
 * bottom sheet listing the options plus an "all" reset row. Mirrors the
 * tuition sort sheet's interaction so hub filters feel native.
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onSelect,
  allLabel,
  style,
}: FilterDropdownProps) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const active = options.find((option) => option.value === selected);
  const text = active?.label ?? allLabel ?? 'All';
  // Long directories (600+ institutes) are unusable without narrowing.
  const searchable = options.length > 15;
  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, search]);
  const closeSheet = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.background,
            borderColor: active ? colors.primary : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name="location-outline"
          size={13}
          color={active ? colors.primary : colors.textSecondary}
        />
        <ThemedText
          type="small"
          themeColor={active ? 'primary' : 'textSecondary'}
          numberOfLines={1}
          style={styles.fieldText}
        >
          {text}
        </ThemedText>
        <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={closeSheet}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {label}
            </ThemedText>
            {searchable ? (
              <View
                style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
              >
                <Ionicons name="search-outline" size={14} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {search ? (
                  <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Pressable
                onPress={() => {
                  onSelect(undefined);
                  closeSheet();
                }}
                accessibilityRole="button"
                accessibilityLabel={allLabel ?? 'All'}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
              <ThemedText themeColor={!selected ? 'primary' : 'text'}>
                {allLabel ?? 'All'}
              </ThemedText>
              {!selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </Pressable>
            {visibleOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value === selected ? undefined : option.value);
                  closeSheet();
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <ThemedText themeColor={option.value === selected ? 'primary' : 'text'} numberOfLines={1}>
                  {option.label}
                </ThemedText>
                {option.value === selected && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
            {searchable && search.trim() && visibleOptions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.noMatch}>
                No matches for “{search.trim()}”
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 120,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
  },
  fieldText: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: 2,
    maxHeight: '70%',
  },
  sheetTitle: {
    marginBottom: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.one,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  noMatch: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});
