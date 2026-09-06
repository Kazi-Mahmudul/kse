import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Section title with an optional right-aligned action ("See All"). */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.action}>
            <ThemedText type="link" themeColor="primary">
              {actionLabel}
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
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
  pressed: {
    opacity: 0.7,
  },
});
