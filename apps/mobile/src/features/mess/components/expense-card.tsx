import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth } from '../lib/dates';
import { paisaToBdtCompact } from '@kse/types';
import type { MessExpense, MessExpenseCategory } from '@kse/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const EXPENSE_CATEGORY_META: Record<MessExpenseCategory, { label: string; icon: IoniconName }> = {
  rent: { label: 'Rent', icon: 'home-outline' },
  gas: { label: 'Gas', icon: 'flame-outline' },
  electricity: { label: 'Electricity', icon: 'flash-outline' },
  water: { label: 'Water', icon: 'water-outline' },
  wifi: { label: 'Wi-Fi', icon: 'wifi-outline' },
  cleaning: { label: 'Cleaning', icon: 'sparkles-outline' },
  maintenance: { label: 'Maintenance', icon: 'construct-outline' },
  furniture: { label: 'Furniture', icon: 'bed-outline' },
  other: { label: 'Other', icon: 'ellipsis-horizontal-outline' },
};

/** One shared-expense row: category, description, date, amount (spec §12). */
export function ExpenseCard({
  expense,
  canDelete,
  onDelete,
}: {
  expense: MessExpense;
  canDelete?: boolean;
  onDelete?: (expense: MessExpense) => void;
}) {
  const colors = useTheme();
  const meta = EXPENSE_CATEGORY_META[expense.category] ?? EXPENSE_CATEGORY_META.other;

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: `${colors.warning}1A` }]}>
        <Ionicons name={meta.icon} size={16} color={colors.warning} />
      </View>
      <View style={styles.meta}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {meta.label}
          {expense.description ? <ThemedText type="small" themeColor="textSecondary"> · {expense.description}</ThemedText> : null}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {formatDayMonth(expense.expense_date)}
          {expense.paid_by_profile?.full_name ? ` · paid by ${expense.paid_by_profile.full_name}` : ''}
        </ThemedText>
      </View>
      <ThemedText style={[styles.amount, { color: colors.danger }]}>
        {paisaToBdtCompact(expense.amount)}
      </ThemedText>
      {canDelete && onDelete ? (
        <Pressable
          onPress={() => onDelete(expense)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${meta.label} expense`}
          hitSlop={8}
          style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 1,
  },
  amount: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
  },
  trash: {
    padding: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
