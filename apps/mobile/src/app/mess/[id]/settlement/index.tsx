/**
 * Settlement (spec §14): monthly summary with a transparent breakdown of
 * how the final number was calculated. Managers generate, publish and lock
 * the month — actions that exist in the mess-actions edge function.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertConfirm, alertInfo } from '@/lib/dialogs';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BackHeader } from '@/components/back-header';
import { Screen } from '@/components/ui/screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useGenerateSettlement,
  useLockSettlement,
  useMessDetail,
  usePublishSettlement,
  useSettlement,
} from '@/features/mess/queries';
import { MonthSwitcher } from '@/features/mess/components/month-switcher';
import { SectionLabel } from '@/features/mess/components/section-label';
import { StatusBadge, type BadgeTone } from '@/features/mess/components/status-badge';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { monthRangeFrom } from '@/features/mess/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import { paisaToBdtCompact } from '@kse/types';
import type { SettlementItem, SettlementStatus } from '@kse/types';

export default function SettlementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  // Default to the previous (just-finished) month — that's the month you settle.
  const [monthOffset, setMonthOffset] = useState(-1);
  const month = monthRangeFrom(monthOffset);

  const { data: settlement, isLoading, isError, error, refetch, isRefetching } = useSettlement(messId, month.start);
  const { data: mess } = useMessDetail(messId);
  const generateSettlement = useGenerateSettlement();
  const publishSettlement = usePublishSettlement();
  const lockSettlement = useLockSettlement();

  const isManager = mess?.manager_id === currentUserId;

  const myItem = useMemo(
    () => settlement?.items.find((i) => i.member_id === currentUserId) ?? null,
    [settlement, currentUserId],
  );

  const statusTone: Record<SettlementStatus, BadgeTone> = {
    draft: 'pending',
    published: 'paid',
    locked: 'locked',
  };

  const handleGenerate = () => {
    alertConfirm(
      `Generate ${month.label} settlement?`,
      'This calculates the meal rate and each member’s balance from the month’s bazar, expenses, meals and payments. You can review it as a draft before publishing.',
      () =>
        generateSettlement.mutate(
          { messId, monthStart: month.start, monthEnd: month.end },
          {
            onSuccess: () => alertInfo('Draft ready', 'Review the numbers, then publish when they look right.'),
            onError: (e) => alertInfo('Could not generate', (e as Error).message),
          },
        ),
      { confirmLabel: 'Generate' },
    );
  };

  const handlePublish = () => {
    if (!settlement) return;
    alertConfirm(
      'Publish settlement?',
      'Members will see this as their official balance for the month.',
      () =>
        publishSettlement.mutate(
          { settlementId: settlement.id },
          { onError: (e) => alertInfo('Could not publish', (e as Error).message) },
        ),
      { confirmLabel: 'Publish' },
    );
  };

  const handleLock = () => {
    if (!settlement) return;
    alertConfirm(
      'Lock this month?',
      'Locking freezes the month — bazar entries and expenses in this period can no longer be changed.',
      () =>
        lockSettlement.mutate(
          { settlementId: settlement.id },
          { onError: (e) => alertInfo('Could not lock', (e as Error).message) },
        ),
      { confirmLabel: 'Lock Month', destructive: true },
    );
  };

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      <BackHeader title="Settlement" />

      <MonthSwitcher
        label={month.label}
        onPrev={() => setMonthOffset((m) => m - 1)}
        onNext={() => setMonthOffset((m) => Math.min(m + 1, 0))}
        nextDisabled={monthOffset === 0}
      />

      {isLoading ? (
        <InlineLoading label="Loading settlement…" />
      ) : isError ? (
        <ErrorBox message={error?.message ?? 'Could not load the settlement.'} onRetry={() => refetch()} />
      ) : !settlement ? (
        <EmptyState
          icon="document-text-outline"
          title={`${month.label.split(' ')[0]} settlement hasn’t been published yet`}
          message={
            isManager
              ? 'Generate the draft from this month’s bazar, expenses, meals and payments.'
              : 'Your manager will publish it when the month closes.'
          }
          actionLabel={isManager ? 'Generate Settlement' : undefined}
          onAction={isManager ? handleGenerate : undefined}
        />
      ) : (
        <View style={styles.body}>
          {/* Summary (spec §14) */}
          <View style={[styles.summary, { backgroundColor: `${colors.primary}0F`, borderColor: `${colors.primary}33` }]}>
            <View style={styles.summaryHead}>
              <ThemedText type="smallBold">
                {month.label} Settlement
              </ThemedText>
              <StatusBadge
                label={settlement.status === 'draft' ? 'Draft' : settlement.status === 'published' ? 'Published' : 'Locked'}
                tone={statusTone[settlement.status]}
              />
            </View>

            {myItem ? (
              <>
                <Breakdown item={myItem} mealRate={settlement.meal_rate} />
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                You were not an active member for this month.
              </ThemedText>
            )}
          </View>

          {/* Manager actions */}
          {isManager ? (
            <View style={styles.managerRow}>
              {settlement.status === 'draft' ? (
                <>
                  <PrimaryButton
                    label="Publish"
                    loading={publishSettlement.isPending}
                    onPress={handlePublish}
                    style={styles.managerBtn}
                  />
                  <PrimaryButton
                    label="Regenerate"
                    variant="outline"
                    loading={generateSettlement.isPending}
                    onPress={handleGenerate}
                    style={styles.managerBtn}
                  />
                </>
              ) : settlement.status === 'published' ? (
                <PrimaryButton
                  label="Lock Month"
                  variant="outline"
                  loading={lockSettlement.isPending}
                  onPress={handleLock}
                />
              ) : null}
            </View>
          ) : null}

          {/* Everyone: month totals + member list (spec §14 detailed breakdown) */}
          <SectionLabel>MONTH TOTALS</SectionLabel>
          <View style={[styles.totals, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Total label="Total meals" value={String(settlement.total_meals)} />
            <Total label="Meal rate" value={paisaToBdtCompact(settlement.meal_rate)} />
            <Total label="Bazar + expenses" value={paisaToBdtCompact(settlement.total_meal_cost)} />
          </View>

          <SectionLabel>ALL MEMBERS</SectionLabel>
          <View style={styles.members}>
            {(settlement.items ?? []).map((item) => (
              <View
                key={item.id}
                style={[styles.memberCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <View style={styles.memberHead}>
                  <ProfileAvatar name={item.member?.full_name ?? '?'} size={32} ringSize={1} />
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.memberName}>
                    {item.member?.full_name ?? 'Unknown'}
                  </ThemedText>
                  <StatusBadge
                    label={
                      item.balance_type === 'due'
                        ? `${paisaToBdtCompact(item.balance)} due`
                        : item.balance_type === 'receivable'
                          ? `${paisaToBdtCompact(Math.abs(item.balance))} back`
                          : 'Settled'
                    }
                    tone={item.balance_type === 'due' ? 'due' : item.balance_type === 'receivable' ? 'paid' : 'neutral'}
                  />
                </View>
                <View style={styles.memberRows}>
                  <MiniRow label={`Meals · ${item.total_meals} × ${paisaToBdtCompact(settlement.meal_rate)}`} value={paisaToBdtCompact(item.meal_cost)} />
                  <MiniRow label="Shared expenses" value={paisaToBdtCompact(item.shared_expense_share)} />
                  <MiniRow label="Bazar bought" value={`−${paisaToBdtCompact(item.bazar_contribution)}`} credit />
                  <MiniRow label="Payments" value={`−${paisaToBdtCompact(item.total_payments)}`} credit />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Breakdown({ item, mealRate }: { item: SettlementItem; mealRate: number }) {
  const colors = useTheme();
  return (
    <View style={styles.breakdown}>
      <BigRow label="Total meals" value={String(item.total_meals)} />
      <BigRow label="Meal rate" value={paisaToBdtCompact(mealRate)} />
      <BigRow label="My meal cost" value={paisaToBdtCompact(item.meal_cost)} />
      <BigRow label="Shared expenses" value={paisaToBdtCompact(item.shared_expense_share)} />
      <BigRow label="Bazar I bought" value={`−${paisaToBdtCompact(item.bazar_contribution)}`} credit />
      <BigRow label="Payments" value={`−${paisaToBdtCompact(item.total_payments)}`} credit />
      <View style={[styles.finalRow, { borderTopColor: colors.border }]}>
        <ThemedText type="smallBold">Final balance</ThemedText>
        <ThemedText
          style={[
            styles.finalValue,
            {
              color:
                item.balance_type === 'due' ? colors.danger : item.balance_type === 'receivable' ? colors.success : colors.text,
            },
          ]}
        >
          {item.balance_type === 'settled'
            ? 'Settled'
            : `${paisaToBdtCompact(Math.abs(item.balance))} ${item.balance_type === 'due' ? 'due' : 'receivable'}`}
        </ThemedText>
      </View>
    </View>
  );
}

function BigRow({ label, value, credit }: { label: string; value: string; credit?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.bigRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ color: credit ? colors.success : colors.text }}>
        {value}
      </ThemedText>
    </View>
  );
}

function MiniRow({ label, value, credit }: { label: string; value: string; credit?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.miniRow}>
      <ThemedText type="small" themeColor="textMuted">
        {label}
      </ThemedText>
      <ThemedText type="small" style={{ color: credit ? colors.success : colors.textSecondary }}>
        {value}
      </ThemedText>
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.total}>
      <ThemedText style={styles.totalValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three - 6,
  },
  summary: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four - 4,
    gap: Spacing.three - 6,
  },
  summaryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdown: {
    gap: 8,
  },
  bigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 2,
  },
  finalValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  managerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  managerBtn: {
    flex: 1,
  },
  totals: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  total: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  totalValue: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 17,
    lineHeight: 22,
  },
  members: {
    gap: Spacing.three - 6,
  },
  memberCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three - 6,
  },
  memberHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
  },
  memberName: {
    flex: 1,
  },
  memberRows: {
    gap: 3,
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
