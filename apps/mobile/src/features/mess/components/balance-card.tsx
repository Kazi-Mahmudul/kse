import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { paisaToBdtCompact } from '@kse/types';
import type { RunningBalance } from '@kse/types';
import { StatusBadge } from './status-badge';

/**
 * "My Balance" card (spec §13): large total with a full breakdown so the
 * user can see exactly where the number came from — never just the total.
 */
export function BalanceCard({ balance }: { balance: RunningBalance }) {
  const colors = useTheme();
  const due = balance.balance > 0;
  const settled = balance.balance === 0;
  const amountColor = settled ? colors.text : due ? colors.danger : colors.success;

  return (
    <Card tint="background" style={styles.card}>
      <View style={styles.headRow}>
        <ThemedText type="small" themeColor="textSecondary">
          My Balance · this month
        </ThemedText>
        <StatusBadge
          label={settled ? 'Settled' : due ? 'Due' : 'Receivable'}
          tone={settled ? 'neutral' : due ? 'due' : 'paid'}
        />
      </View>
      <ThemedText style={[styles.amount, { color: amountColor }]}>
        {settled ? paisaToBdtCompact(0) : `${due ? '' : '−'}${paisaToBdtCompact(Math.abs(balance.balance))}`}
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted">
        {settled ? 'You owe nothing this month' : due ? 'You owe the mess' : 'The mess owes you'}
      </ThemedText>

      <View style={[styles.rows, { borderTopColor: colors.border }]}>
        <Row
          label={`Meals · ${balance.meals} × ${paisaToBdtCompact(balance.meal_rate)}`}
          value={paisaToBdtCompact(balance.meal_cost)}
        />
        <Row
          label={`Shared expenses · split by ${balance.active_members}`}
          value={paisaToBdtCompact(balance.shared_expense_share)}
        />
        <Row label="Bazar you bought" value={`−${paisaToBdtCompact(balance.bazar_contribution)}`} credit />
        <Row label="Payments made" value={`−${paisaToBdtCompact(balance.payments)}`} credit />
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <ThemedText type="smallBold">Total</ThemedText>
          <ThemedText type="smallBold" style={{ color: amountColor }}>
            {settled ? paisaToBdtCompact(0) : `${due ? '' : '−'}${paisaToBdtCompact(Math.abs(balance.balance))}`}
            {settled ? '' : due ? ' due' : ' receivable'}
          </ThemedText>
        </View>
      </View>
    </Card>
  );
}

function Row({ label, value, credit }: { label: string; value: string; credit?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ color: credit ? colors.success : colors.text }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.one + 2,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontFamily: FontFamilies.bold,
    fontSize: 38,
    lineHeight: 46,
  },
  rows: {
    marginTop: Spacing.three - 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three - 4,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 2,
  },
});
