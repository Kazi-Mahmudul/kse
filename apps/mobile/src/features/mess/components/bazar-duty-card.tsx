import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeDayLabel, formatWeekday, formatDayMonth } from '../lib/dates';
import { StatusBadge } from './status-badge';

/**
 * "My next bazar duty" highlight card (spec §3/§7) with the primary
 * Exchange action one tap away.
 */
export function BazarDutyCard({
  dutyDate,
  onExchange,
  disabled,
}: {
  dutyDate: string;
  onExchange?: () => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const rel = relativeDayLabel(dutyDate);

  return (
    <View
      style={[styles.card, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}55` }]}
      accessibilityLabel={`Your next bazar duty is ${rel}, ${formatWeekday(dutyDate)} ${formatDayMonth(dutyDate)}`}
    >
      <View style={styles.left}>
        <View style={[styles.icon, { backgroundColor: `${colors.warning}26` }]}>
          <Ionicons name="cart" size={20} color={colors.warning} />
        </View>
        <View style={styles.meta}>
          <ThemedText type="small" themeColor="textSecondary">
            My next duty
          </ThemedText>
          <ThemedText type="smallBold" style={styles.date}>
            {rel === 'Today' || rel === 'Tomorrow' ? `${rel} · ` : ''}
            {formatDayMonth(dutyDate)}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {formatWeekday(dutyDate)}
          </ThemedText>
        </View>
      </View>
      {onExchange ? (
        <Pressable
          onPress={onExchange}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Exchange this bazar duty"
          style={({ pressed }) => [
            styles.exchange,
            { borderColor: colors.warning, backgroundColor: `${colors.warning}1A` },
            (disabled || pressed) && styles.pressed,
          ]}
        >
          <Ionicons name="swap-horizontal" size={14} color={colors.warning} />
          <ThemedText style={[styles.exchangeLabel, { color: colors.warning }]}>Exchange</ThemedText>
        </Pressable>
      ) : (
        <StatusBadge label={rel} tone="pending" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    flex: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    gap: 1,
  },
  date: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  exchange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exchangeLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.65,
  },
});
