import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrimaryButton } from '@/components/ui/primary-button';
import type { IconName } from '@/types/icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Standard empty state (CLAUDE.md §37: loading/empty/error states are required). */
export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name={icon} size={28} color={colors.textSecondary} />
      </View>
      <ThemedText type="smallBold">{title}</ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} variant="outline" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.four,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  message: {
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: Spacing.one,
    alignSelf: 'stretch',
  },
});
