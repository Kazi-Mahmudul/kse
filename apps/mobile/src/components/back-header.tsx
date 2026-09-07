import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Screen header with a back chevron (stack/modal screens). */
export function BackHeader({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    padding: Spacing.one,
    marginLeft: -Spacing.one + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    flexShrink: 1,
  },
});
