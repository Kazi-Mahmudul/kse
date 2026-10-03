import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type BadgeTone = 'on' | 'off' | 'locked' | 'due' | 'paid' | 'pending' | 'neutral' | 'manager';

interface StatusBadgeProps {
  /** Visible text — never rely on colour alone (spec §28). */
  label: string;
  tone: BadgeTone;
  icon?: IoniconName;
}

const TONE_COLOR: Record<BadgeTone, ThemeColor> = {
  on: 'success',
  off: 'textSecondary',
  locked: 'warning',
  due: 'danger',
  paid: 'success',
  pending: 'warning',
  neutral: 'textSecondary',
  manager: 'primary',
};

const TONE_ICON: Record<BadgeTone, IoniconName> = {
  on: 'checkmark',
  off: 'close',
  locked: 'lock-closed',
  due: 'arrow-up',
  paid: 'arrow-down',
  pending: 'time',
  neutral: 'checkmark-done',
  manager: 'shield-checkmark',
};

/**
 * Small status pill used for meal ON/OFF, Due/Paid, Locked, pending states.
 * Always icon + text so colour-blind users still read the state.
 */
export function StatusBadge({ label, tone, icon }: StatusBadgeProps) {
  const colors = useTheme();
  const fg = colors[TONE_COLOR[tone]];

  return (
    <View
      style={[styles.badge, { backgroundColor: `${fg}1F` }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Ionicons name={icon ?? TONE_ICON[tone]} size={12} color={fg} />
      <ThemedText style={[styles.label, { color: fg }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
