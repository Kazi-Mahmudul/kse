import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  onSelect: (value: string | null) => void;
  placeholder?: string;
  /** Show a "None" row that clears the value (default true). */
  clearable?: boolean;
}

/** Read-only row that opens a bottom-sheet picker — no extra dependency. */
export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Not set',
  clearable = true,
}: SelectFieldProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.row,
          { backgroundColor: colors.backgroundElement },
          !selectedLabel && styles.empty,
        ]}
      >
        <Text style={[styles.value, { color: selectedLabel ? colors.text : colors.textSecondary }]}>
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}
        >
          <ThemedView
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
          >
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {label}
            </ThemedText>
            <ScrollView style={styles.options} bounces={false}>
              {clearable && (
                <OptionRow
                  label={placeholder}
                  selected={value === null}
                  onPress={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                />
              )}
              {options.map((option) => (
                <OptionRow
                  key={option.value}
                  label={option.label}
                  selected={option.value === value}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Modal>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    opacity: 0.8,
  },
  value: {
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxHeight: '70%',
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  options: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: Spacing.three - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
});
