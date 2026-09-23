import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';

export interface ActionOption {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  destructive?: boolean;
}

/**
 * Bottom-sheet style action picker (post menu, community FAB). Pure
 * presentational — the caller owns visibility and what happens on select.
 */
export function ActionSheet({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: ActionOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const colors = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  onSelect(option.key);
                }}
              >
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor:
                        option.destructive ? `${colors.danger}1A` : `${colors.primary}1A`,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={option.destructive ? colors.danger : colors.primary}
                  />
                </View>
                <View style={styles.optionText}>
                  <ThemedText
                    type="smallBold"
                    themeColor={option.destructive ? 'danger' : undefined}
                  >
                    {option.label}
                  </ThemedText>
                  {option.description ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {option.description}
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.one + 2,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  title: {
    textAlign: 'center',
  },
  options: {
    gap: Spacing.one + 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
