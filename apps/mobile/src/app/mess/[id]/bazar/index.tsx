/**
 * Bazar — the mess grocery hub (spec §7): month total, my next duty with
 * exchange, incoming/outgoing exchange requests, and the purchases list.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertConfirm, alertInfo } from '@/lib/dialogs';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { EmptyState } from '@/components/ui/empty-state';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useBazarPurchases,
  useDeleteBazarPurchase,
  useMessDetail,
  useMyNextDuty,
  usePendingExchanges,
  useRespondExchange,
} from '@/features/mess/queries';
import { MessScreen } from '@/features/mess/components/mess-screen';
import { MonthSwitcher } from '@/features/mess/components/month-switcher';
import { SectionLabel } from '@/features/mess/components/section-label';
import { BazarEntryCard } from '@/features/mess/components/bazar-entry-card';
import { BazarDutyCard } from '@/features/mess/components/bazar-duty-card';
import { ExchangeSheet } from '@/features/mess/components/exchange-sheet';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { formatDayMonth, monthRangeFrom } from '@/features/mess/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import { paisaToBdtCompact } from '@kse/types';

export default function BazarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const [monthOffset, setMonthOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const month = monthRangeFrom(monthOffset);

  const { data: mess } = useMessDetail(messId);
  const { data: purchases, isLoading, isError, error, refetch, isRefetching } = useBazarPurchases(messId, month.start, month.end);
  const { data: nextDuty } = useMyNextDuty(messId);
  const { data: exchanges } = usePendingExchanges(messId);
  const respondExchange = useRespondExchange();
  const deletePurchase = useDeleteBazarPurchase();

  const totalBazar = purchases?.reduce((sum, p) => sum + p.total_amount, 0) ?? 0;
  const visible = expanded ? (purchases ?? []) : (purchases ?? []).slice(0, 5);
  const isManager = mess?.manager_id === currentUserId;
  const incoming = (exchanges ?? []).filter((x) => x.is_target);
  const outgoing = (exchanges ?? []).filter((x) => x.is_requester);

  const handleDelete = (purchaseId: string, buyer: string) => {
    alertConfirm(
      'Delete bazar entry?',
      `This permanently removes ${buyer}'s entry and its items.`,
      () =>
        deletePurchase.mutate(
          { purchaseId, messId },
          { onError: (e) => alertInfo('Could not delete', (e as Error).message) },
        ),
      { confirmLabel: 'Delete', destructive: true },
    );
  };

  return (
    <MessScreen messId={messId} active="bazar" refreshing={isRefetching} onRefresh={() => refetch()}>
      <MonthSwitcher
        label={month.label}
        onPrev={() => setMonthOffset((m) => m - 1)}
        onNext={() => setMonthOffset((m) => Math.min(m + 1, 0))}
        nextDisabled={monthOffset === 0}
      />

      {/* Total bazar (spec §7) */}
      <View style={[styles.totalCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}44` }]}>
        <View style={styles.totalHead}>
          <Ionicons name="cart-outline" size={16} color={colors.success} />
          <ThemedText type="small" themeColor="textSecondary">
            Total bazar · {month.label.split(' ')[0]}
          </ThemedText>
        </View>
        <ThemedText style={[styles.totalValue, { color: colors.success }]}>
          {paisaToBdtCompact(totalBazar)}
        </ThemedText>
      </View>

      {/* My next duty (spec §7) */}
      <SectionLabel>MY NEXT DUTY</SectionLabel>
      {nextDuty ? (
        <BazarDutyCard
          dutyDate={nextDuty.duty_date}
          disabled={outgoing.length > 0}
          onExchange={() => setExchangeOpen(true)}
        />
      ) : (
        <View style={[styles.noDuty, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="calendar-clear-outline" size={16} color={colors.textMuted} />
          <ThemedText type="small" themeColor="textSecondary">
            No upcoming bazar duty assigned to you
          </ThemedText>
        </View>
      )}
      <PrimaryButton
        label="View Duty Calendar"
        variant="outline"
        size="compact"
        onPress={() => router.push({ pathname: '/mess/[id]/bazar/duty', params: { id: messId } } as never)}
        style={styles.dutyLink}
      />

      {/* Incoming exchange requests (spec §9) */}
      {incoming.map((x) => (
        <View key={x.id} style={[styles.exchangeCard, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}55` }]}>
          <View style={styles.exchangeMeta}>
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.warning} />
            <View style={styles.exchangeText}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {x.requester_name ?? 'A member'} wants to exchange duty
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Their {formatDayMonth(x.requester_duty_date)} ↔ your {formatDayMonth(x.target_duty_date)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.exchangeActions}>
            <PrimaryButton
              label="Accept"
              size="compact"
              loading={respondExchange.isPending}
              onPress={() =>
                respondExchange.mutate(
                  { exchangeId: x.id, action: 'accept' },
                  {
                    onSuccess: () => alertInfo('Exchange accepted', 'Duty dates have been swapped.'),
                    onError: (e) => alertInfo('Could not accept', (e as Error).message),
                  },
                )
              }
              style={styles.exchangeBtn}
            />
            <PrimaryButton
              label="Reject"
              size="compact"
              variant="outline"
              loading={respondExchange.isPending}
              onPress={() => alertConfirm(
                'Reject exchange?',
                'The other member will be notified.',
                () =>
                  respondExchange.mutate(
                    { exchangeId: x.id, action: 'reject' },
                    { onError: (e) => alertInfo('Could not reject', (e as Error).message) },
                  ),
                { confirmLabel: 'Reject', destructive: true },
              )}
              style={styles.exchangeBtn}
            />
          </View>
        </View>
      ))}

      {/* Outgoing requests — status chips */}
      {outgoing.map((x) => (
        <View key={x.id} style={[styles.outgoing, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="time-outline" size={14} color={colors.warning} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.outgoingText}>
            Waiting for {x.target_name ?? 'member'}: your {formatDayMonth(x.requester_duty_date)} ↔ their {formatDayMonth(x.target_duty_date)}
          </ThemedText>
        </View>
      ))}

      {/* Add entry */}
      <PrimaryButton
        label="Add Bazar Entry"
        onPress={() => router.push({ pathname: '/mess/[id]/bazar/add', params: { id: messId } } as never)}
      />

      {/* Recent bazar (spec §7) */}
      <SectionLabel>BAZAR ENTRIES</SectionLabel>
      {isLoading ? (
        <InlineLoading />
      ) : isError ? (
        <ErrorBox message={error?.message ?? 'Could not load bazar entries.'} onRetry={() => refetch()} />
      ) : (purchases ?? []).length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="No bazar recorded yet"
          message="Entries added by members appear here."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((p) => (
            <BazarEntryCard
              key={p.id}
              purchase={p}
              canDelete={isManager || p.buyer_id === currentUserId}
              onDelete={(purchase) => handleDelete(purchase.id, purchase.buyer_name ?? 'this')}
            />
          ))}
          {(purchases?.length ?? 0) > 5 ? (
            <PrimaryButton
              label={expanded ? 'Show less' : `View all ${purchases?.length} entries`}
              variant="outline"
              size="compact"
              onPress={() => setExpanded((v) => !v)}
            />
          ) : null}
        </View>
      )}

      <ExchangeSheet
        messId={messId}
        myDutyId={nextDuty?.id ?? null}
        myDutyDate={nextDuty?.duty_date ?? null}
        visible={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
      />
    </MessScreen>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 4,
  },
  totalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  noDuty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 14,
    padding: Spacing.three,
  },
  dutyLink: {
    alignSelf: 'flex-start',
  },
  exchangeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three - 6,
  },
  exchangeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
  },
  exchangeText: {
    flex: 1,
    gap: 1,
  },
  exchangeActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  exchangeBtn: {
    flex: 1,
  },
  outgoing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: Spacing.three - 4,
  },
  outgoingText: {
    flex: 1,
  },
  list: {
    gap: Spacing.three - 6,
  },
});
