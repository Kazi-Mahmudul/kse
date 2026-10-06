/**
 * Expenses — shared mess costs (spec §12): rent, utilities, wifi…
 * Total for the month plus a clean transaction list. Managers add and
 * delete expenses; everyone sees the list.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertConfirm, alertInfo } from '@/lib/dialogs';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BackHeader } from '@/components/back-header';
import { Screen } from '@/components/ui/screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EmptyState } from '@/components/ui/empty-state';
import { InputField } from '@/features/mess/components/input-field';
import { SelectField } from '@/components/ui/select-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useAddExpense,
  useDeleteExpense,
  useMessDetail,
  useMessExpenses,
  useMessMembers,
} from '@/features/mess/queries';
import { MonthSwitcher } from '@/features/mess/components/month-switcher';
import { SectionLabel } from '@/features/mess/components/section-label';
import { ExpenseCard, EXPENSE_CATEGORY_META } from '@/features/mess/components/expense-card';
import { Sheet } from '@/features/mess/components/sheet';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { dhakaToday, monthRangeFrom } from '@/features/mess/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import { bdtToPaisa, paisaToBdtCompact } from '@kse/types';
import type { ExpenseInput, MessExpenseCategory } from '@kse/types';

export default function ExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const [monthOffset, setMonthOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const month = monthRangeFrom(monthOffset);

  const { data: expenses, isLoading, isError, error, refetch, isRefetching } = useMessExpenses(messId, month.start, month.end);
  const { data: mess } = useMessDetail(messId);
  const { data: members } = useMessMembers(messId);
  const addExpense = useAddExpense();
  const deleteExpense = useDeleteExpense();

  const isManager = mess?.manager_id === currentUserId;
  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const activeMembers = (members ?? []).filter((m) => m.status === 'active');

  const handleDelete = (expenseId: string, label: string) => {
    alertConfirm(
      'Delete expense?',
      `The ${label} expense will be removed permanently.`,
      () =>
        deleteExpense.mutate(
          { expenseId },
          { onError: (e) => alertInfo('Could not delete', (e as Error).message) },
        ),
      { confirmLabel: 'Delete', destructive: true },
    );
  };

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      <BackHeader title="Expenses" />

      <MonthSwitcher
        label={month.label}
        onPrev={() => setMonthOffset((m) => m - 1)}
        onNext={() => setMonthOffset((m) => Math.min(m + 1, 0))}
        nextDisabled={monthOffset === 0}
      />

      {/* Total (spec §12) */}
      <View style={[styles.totalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Total expenses · {month.label.split(' ')[0]}
        </ThemedText>
        <ThemedText style={[styles.totalValue, { color: colors.text }]}>
          {paisaToBdtCompact(total)}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          Shared costs split evenly across {activeMembers.length || '—'} member{activeMembers.length === 1 ? '' : 's'}
        </ThemedText>
      </View>

      {isManager ? (
        <PrimaryButton label="+ Add Expense" onPress={() => setAddOpen(true)} />
      ) : null}

      {/* Transaction list (spec §12) */}
      <SectionLabel>THIS MONTH</SectionLabel>
      {isLoading ? (
        <InlineLoading />
      ) : isError ? (
        <ErrorBox message={error?.message ?? 'Could not load expenses.'} onRetry={() => refetch()} />
      ) : (expenses ?? []).length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No expenses recorded"
          message={isManager ? 'Add the first shared expense for this month.' : 'Your manager hasn’t added expenses for this month yet.'}
          actionLabel={isManager ? 'Add Expense' : undefined}
          onAction={isManager ? () => setAddOpen(true) : undefined}
        />
      ) : (
        <View style={styles.list}>
          {(expenses ?? []).map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              canDelete={isManager}
              onDelete={(e) =>
                handleDelete(e.id, EXPENSE_CATEGORY_META[e.category]?.label.toLowerCase() ?? 'shared')
              }
            />
          ))}
        </View>
      )}

      {/* Manager add sheet */}
      <AddExpenseSheet
        visible={addOpen}
        messId={messId}
        currentUserId={currentUserId ?? ''}
        members={activeMembers.map((m) => ({ id: m.user_id, name: m.user_name ?? 'Member' }))}
        loading={addExpense.isPending}
        onClose={() => setAddOpen(false)}
        onSaved={() => setAddOpen(false)}
        submit={(input) => addExpense.mutateAsync(input)}
      />
    </Screen>
  );
}

function AddExpenseSheet({
  visible,
  messId,
  currentUserId,
  members,
  loading,
  onClose,
  onSaved,
  submit,
}: {
  visible: boolean;
  messId: string;
  currentUserId: string;
  members: { id: string; name: string }[];
  loading: boolean;
  onClose: () => void;
  onSaved: () => void;
  submit: (input: ExpenseInput) => Promise<unknown>;
}) {
  const [category, setCategory] = useState<MessExpenseCategory>('wifi');
  const [paidBy, setPaidBy] = useState<string | null>(currentUserId);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(dhakaToday());

  const save = async () => {
    const paisa = bdtToPaisa(amount);
    if (paisa <= 0) {
      alertInfo('Enter an amount');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      alertInfo('Check the date', 'Use the YYYY-MM-DD format.');
      return;
    }
    try {
      await submit({
        mess_id: messId,
        paid_by: paidBy ?? currentUserId,
        category,
        amount: paisa,
        expense_date: date.trim(),
        description: description.trim() || undefined,
        is_shared: true,
      });
      setAmount('');
      setDescription('');
      onSaved();
    } catch (e) {
      alertInfo('Could not save', (e as Error).message);
    }
  };

  const categoryOptions = (Object.keys(EXPENSE_CATEGORY_META) as MessExpenseCategory[]).map((c) => ({
    value: c,
    label: EXPENSE_CATEGORY_META[c].label,
  }));

  return (
    <Sheet visible={visible} onClose={onClose} title="Add Expense">
      <View style={styles.sheetForm}>
        <SelectField
          label="Category"
          value={category}
          options={categoryOptions}
          onSelect={(v) => setCategory((v ?? 'other') as MessExpenseCategory)}
          clearable={false}
        />
        <SelectField
          label="Paid by"
          value={paidBy}
          options={members.map((m) => ({ value: m.id, label: m.name }))}
          onSelect={setPaidBy}
          clearable={false}
        />
        <InputField
          value={amount}
          onChangeText={setAmount}
          label="Amount (৳)"
          keyboardType="decimal-pad"
          placeholder="1000"
        />
        <InputField
          value={date}
          onChangeText={setDate}
          label="Date"
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <InputField
          value={description}
          onChangeText={setDescription}
          label="Description (optional)"
          placeholder="e.g. September bill"
        />
        <PrimaryButton label="Save Expense" loading={loading} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 4,
  },
  totalValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  list: {
    gap: Spacing.three - 6,
  },
  sheetForm: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
