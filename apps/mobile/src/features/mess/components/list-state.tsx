import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Centered spinner for a loading section (spec §22). */
export function InlineLoading({ label = 'Loading…' }: { label?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Inline error box with retry (spec §22 — no blank screens). */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useTheme();
  return (
    <View
      style={[styles.container, styles.error, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}44` }]}
    >
      <Ionicons name="cloud-offline-outline" size={24} color={colors.danger} />
      <ThemedText type="smallBold" style={styles.label}>
        Something went wrong
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry ? <PrimaryButton label="Retry" variant="outline" size="compact" onPress={onRetry} style={styles.retry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.four,
  },
  error: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  label: {
    marginTop: 2,
  },
  message: {
    textAlign: 'center',
  },
  retry: {
    marginTop: Spacing.one,
  },
});
