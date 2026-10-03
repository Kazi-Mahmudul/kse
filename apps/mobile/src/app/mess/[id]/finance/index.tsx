/**
 * Finance — My Balance with full breakdown (spec §13) and the member's
 * payment history (spec §15). Payments are recorded against the existing
 * mess payment system (auto-confirmed, manager can also record for you).
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertInfo } from '@/lib/dialogs';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EmptyState } from '@/components/ui/empty-state';
import { InputField } from '@/features/mess/components/input-field';
import { SelectField } from '@/components/ui/select-field';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMyRunningBalance, useMessPayments, useRecordPayment } from '@/features/mess/queries';
import { MessScreen } from '@/features/mess/components/mess-screen';
import { SectionLabel } from '@/features/mess/components/section-label';
import { BalanceCard } from '@/features/mess/components/balance-card';
import { Sheet } from '@/features/mess/components/sheet';
import { StatusBadge } from '@/features/mess/components/status-badge';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { dhakaToday, formatDayMonth } from '@/features/mess/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import { bdtToPaisa, paisaToBdtCompact } from '@kse/types';
import type { PaymentMethod } from '@kse/types';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank: 'Bank',
  mobile_banking: 'bKash / Mobile',
  other: 'Other',
};

export default function FinanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: balance, isLoading, isError, error, refetch, isRefetching } = useMyRunningBalance(messId);
  const { data: payments, isLoading: paymentsLoading } = useMessPayments(messId, currentUserId ?? undefined);
  const recordPayment = useRecordPayment();
  const [payOpen, setPayOpen] = useState(false);

  return (
    <MessScreen messId={messId} active="finance" refreshing={isRefetching} onRefresh={() => refetch()}>
      {/* My Balance (spec §13) */}
      {isLoading ? (
        <InlineLoading label="Calculating your balance…" />
      ) : isError || !balance ? (
        <ErrorBox message={error?.message ?? 'Could not load your balance.'} onRetry={() => refetch()} />
      ) : (
        <BalanceCard balance={balance} />
      )}

      <PrimaryButton label="Record a Payment" onPress={() => setPayOpen(true)} />

      {/* Payment history (spec §15) */}
      <SectionLabel>PAYMENT HISTORY</SectionLabel>
      {paymentsLoading ? (
        <InlineLoading />
      ) : (payments ?? []).length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title="No payments yet"
          message="Payments you or your manager record will appear here."
        />
      ) : (
        <View style={styles.list}>
          {(payments ?? []).map((p) => (
            <View
              key={p.id}
              style={[styles.paymentRow, { backgroundColor: colors.background, borderColor: colors.border }]}
              accessibilityLabel={`${formatDayMonth(p.payment_date)}, ${paisaToBdtCompact(p.amount)} via ${METHOD_LABELS[p.payment_method]}, ${p.status}`}
            >
              <View style={styles.paymentMeta}>
                <ThemedText type="smallBold">{formatDayMonth(p.payment_date)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {METHOD_LABELS[p.payment_method]}
                  {p.reference ? ` · ${p.reference}` : ''}
                </ThemedText>
              </View>
              <View style={styles.paymentRight}>
                <ThemedText style={[styles.paymentAmount, { color: colors.success }]}>
                  +{paisaToBdtCompact(p.amount)}
                </ThemedText>
                <StatusBadge
                  label={p.status === 'confirmed' ? 'Confirmed' : p.status === 'pending' ? 'Pending' : 'Rejected'}
                  tone={p.status === 'confirmed' ? 'paid' : p.status === 'pending' ? 'pending' : 'due'}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <RecordPaymentSheet
        visible={payOpen}
        messId={messId}
        memberId={currentUserId ?? ''}
        loading={recordPayment.isPending}
        onClose={() => setPayOpen(false)}
        onSaved={() => setPayOpen(false)}
        submit={(input) => recordPayment.mutateAsync(input)}
      />
    </MessScreen>
  );
}

function RecordPaymentSheet({
  visible,
  messId,
  memberId,
  loading,
  onClose,
  onSaved,
  submit,
}: {
  visible: boolean;
  messId: string;
  memberId: string;
  loading: boolean;
  onClose: () => void;
  onSaved: () => void;
  submit: (input: {
    mess_id: string;
    member_id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    reference?: string;
    note?: string;
  }) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
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
        member_id: memberId,
        amount: paisa,
        payment_date: date.trim(),
        payment_method: method,
        reference: reference.trim() || undefined,
      });
      setAmount('');
      setReference('');
      alertInfo('Payment recorded', 'Your manager can verify it later.');
      onSaved();
    } catch (e) {
      alertInfo('Could not record', (e as Error).message);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Record a Payment">
      <View style={styles.sheetForm}>
        <InputField
          value={amount}
          onChangeText={setAmount}
          label="Amount (৳)"
          keyboardType="decimal-pad"
          placeholder="2000"
        />
        <SelectField
          label="Method"
          value={method}
          clearable={false}
          options={(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => ({
            value: m,
            label: METHOD_LABELS[m],
          }))}
          onSelect={(v) => setMethod((v ?? 'cash') as PaymentMethod)}
        />
        <InputField
          value={reference}
          onChangeText={setReference}
          label="Reference (optional)"
          placeholder="e.g. bKash TrxID"
          autoCapitalize="characters"
        />
        <InputField
          value={date}
          onChangeText={setDate}
          label="Date"
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton label="Save Payment" loading={loading} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three - 6,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three - 4,
  },
  paymentMeta: {
    flex: 1,
    gap: 1,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 15,
  },
  sheetForm: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
