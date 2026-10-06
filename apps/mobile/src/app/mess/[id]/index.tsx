/**
 * Mess Home — the dashboard a member understands in seconds (spec §3).
 * Today's meals with one-tap ON/OFF, my status, next bazar duty with
 * exchange, quick actions. Announcements stay a single subtle banner.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { alertConfirm, alertInfo } from '@/lib/dialogs';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useMemberDashboard,
  useMealCutoffSettings,
  usePendingExchanges,
  useRespondExchange,
  useToggleMeal,
} from '@/features/mess/queries';
import { MessScreen } from '@/features/mess/components/mess-screen';
import { SectionLabel } from '@/features/mess/components/section-label';
import { StatusBadge } from '@/features/mess/components/status-badge';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { ExchangeSheet } from '@/features/mess/components/exchange-sheet';
import { mealCutoff } from '@/features/mess/lib/cutoff';
import { dhakaToday, relativeDayLabel, formatDayMonth, formatWeekday } from '@/features/mess/lib/dates';
import { paisaToBdtCompact } from '@kse/types';
import type { MealState, MealType } from '@kse/types';

const MEAL_ICONS: Record<MealType, 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline'> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
};

export default function MessDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();

  const { data: dashboard, isLoading, isError, error, refetch, isRefetching } = useMemberDashboard(id ?? '');
  const { data: cutoffSettings } = useMealCutoffSettings(id ?? '');
  const { data: exchanges } = usePendingExchanges(id ?? '');
  const toggleMeal = useToggleMeal();
  const respondExchange = useRespondExchange();
  const [exchangeOpen, setExchangeOpen] = useState(false);

  const today = dhakaToday();

  if (isLoading) {
    return (
      <MessScreen messId={id ?? ''} active="home">
        <InlineLoading label="Loading your mess…" />
      </MessScreen>
    );
  }

  if (isError || !dashboard) {
    return (
      <MessScreen messId={id ?? ''} active="home">
        <ErrorBox message={error?.message ?? 'Could not load your mess.'} onRetry={() => refetch()} />
      </MessScreen>
    );
  }

  const { mess, today_meals, current_month_meals, my_next_duty, current_meal_rate, my_balance, my_balance_type, announcements } = dashboard;
  const myExchanges = (exchanges ?? []).filter((x) => x.is_target);

  const handleToggle = (mealType: MealType, current: MealState) => {
    const info = mealCutoff(today, mealType, cutoffSettings);
    if (!info.canModify) {
      alertInfo('Change closed', `The change window for ${mealType} has closed (was ${info.label.replace('closed at ', 'at ')}).`);
      return;
    }
    toggleMeal.mutate(
      { mess_id: id ?? '', meal_date: today, meal_type: mealType, state: current === 'on' ? 'off' : 'on' },
      { onError: (e) => alertInfo('Could not update meal', (e as Error).message) },
    );
  };

  return (
    <MessScreen messId={id ?? ''} active="home" refreshing={isRefetching} onRefresh={() => refetch()}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {mess.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[mess.location, `${mess.member_count ?? 1} member${mess.member_count === 1 ? '' : 's'}`]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/mess/[id]/settings', params: { id: String(id) } } as never)}
          accessibilityRole="button"
          accessibilityLabel="Mess settings"
          hitSlop={8}
          style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Announcement — one subtle banner, never a feed (spec §17) */}
      {announcements.length > 0 ? (
        <View style={[styles.announce, { backgroundColor: `${colors.primary}0F`, borderColor: `${colors.primary}33` }]}>
          <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
          <View style={styles.announceText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {announcements[0].title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {announcements[0].content}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {/* Incoming exchange requests (spec §9) */}
      {myExchanges.map((x) => (
        <View key={x.id} style={[styles.exchangeCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.exchangeMeta}>
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
            <View style={styles.exchangeText}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {x.requester_name ?? 'A member'} wants to exchange bazar duty
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDayMonth(x.requester_duty_date)} ↔ {formatDayMonth(x.target_duty_date)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.exchangeActions}>
            <ActionButton
              label="Accept"
              tone="solid"
              loading={respondExchange.isPending}
              onPress={() => {
                respondExchange.mutate(
                  { exchangeId: x.id, action: 'accept' },
                  {
                    onSuccess: () => alertInfo('Exchange accepted', 'The duty dates have been swapped.'),
                    onError: (e) => alertInfo('Could not accept', (e as Error).message),
                  },
                );
              }}
            />
            <ActionButton
              label="Reject"
              tone="outline-danger"
              loading={respondExchange.isPending}
              onPress={() => {
                alertConfirm(
                  'Reject exchange?',
                  'The other member will be notified.',
                  () =>
                    respondExchange.mutate(
                      { exchangeId: x.id, action: 'reject' },
                      { onError: (e) => alertInfo('Could not reject', (e as Error).message) },
                    ),
                  { confirmLabel: 'Reject', destructive: true },
                );
              }}
            />
          </View>
        </View>
      ))}

      {/* TODAY (spec §3) */}
      <SectionLabel>TODAY</SectionLabel>
      <View style={[styles.todayCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.push({ pathname: '/mess/[id]/meals', params: { id: String(id) } } as never)}
          accessibilityRole="button"
          accessibilityLabel="Manage today's meals"
          style={({ pressed }) => [styles.todayHeader, pressed && styles.pressed]}
        >
          <View>
            <ThemedText type="smallBold">{formatWeekday(today)}</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {formatDayMonth(today)}
            </ThemedText>
          </View>
          <View style={styles.manageRow}>
            <ThemedText type="small" themeColor="primary">
              Manage Meals
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </Pressable>
        <View style={styles.mealRow}>
          {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mt) => {
            const state = today_meals[mt];
            const info = mealCutoff(today, mt, cutoffSettings);
            const disabled = !info.canModify || toggleMeal.isPending;
            return (
              <Pressable
                key={mt}
                onPress={() => handleToggle(mt, state)}
                disabled={disabled}
                accessibilityRole="switch"
                accessibilityState={{ checked: state === 'on', disabled }}
                accessibilityLabel={`${mt} ${state}${info.canModify ? '' : ', change closed'}`}
                style={({ pressed }) => [
                  styles.mealChip,
                  {
                    backgroundColor: state === 'on' ? `${colors.success}14` : colors.surfaceMuted,
                    borderColor: state === 'on' ? `${colors.success}44` : colors.border,
                  },
                  disabled && styles.mealChipLocked,
                  pressed && !disabled && styles.pressed,
                ]}
              >
                <Ionicons name={MEAL_ICONS[mt]} size={18} color={state === 'on' ? colors.success : colors.textMuted} />
                <ThemedText
                  type="small"
                  style={{ color: state === 'on' ? colors.text : colors.textSecondary }}
                >
                  {mt === 'breakfast' ? 'Breakfast' : mt === 'lunch' ? 'Lunch' : 'Dinner'}
                </ThemedText>
                <StatusBadge label={state === 'on' ? 'ON' : 'OFF'} tone={state === 'on' ? 'on' : 'off'} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* MY MESS STATUS (spec §3) */}
      <SectionLabel>MY MESS STATUS</SectionLabel>
      <View style={[styles.statusCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Stat label="Meals this month" value={String(current_month_meals)} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <Stat label="Meal rate" value={paisaToBdtCompact(current_meal_rate)} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={() => router.push({ pathname: '/mess/[id]/finance', params: { id: String(id) } } as never)}
          accessibilityRole="button"
          accessibilityLabel={`My balance ${my_balance_type}, view details`}
          style={({ pressed }) => [styles.balanceStat, pressed && styles.pressed]}
        >
          <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
            My balance
          </ThemedText>
          <ThemedText
            style={[
              styles.statValue,
              {
                color:
                  my_balance_type === 'due' ? colors.danger : my_balance_type === 'receivable' ? colors.success : colors.text,
              },
            ]}
          >
            {my_balance_type === 'settled' ? 'Settled' : paisaToBdtCompact(Math.abs(my_balance))}
          </ThemedText>
          <StatusBadge
            label={my_balance_type === 'due' ? 'Due' : my_balance_type === 'receivable' ? 'Receivable' : 'Paid up'}
            tone={my_balance_type === 'due' ? 'due' : my_balance_type === 'receivable' ? 'paid' : 'neutral'}
          />
        </Pressable>
      </View>

      {/* BAZAR (spec §3) */}
      <SectionLabel>BAZAR</SectionLabel>
      {my_next_duty ? (
        <View style={[styles.dutyCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.dutyMeta}>
            <View style={[styles.dutyIcon, { backgroundColor: `${colors.primary}1A` }]}>
              <Ionicons name="cart" size={18} color={colors.primary} />
            </View>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                My next duty
              </ThemedText>
              <ThemedText type="smallBold" style={styles.dutyDate}>
                {relativeDayLabel(my_next_duty.duty_date)} · {formatDayMonth(my_next_duty.duty_date)}
              </ThemedText>
            </View>
          </View>
          <ActionButton
            label="Exchange"
            tone="outline"
            onPress={() => setExchangeOpen(true)}
            disabled={exchanges?.some((x) => x.is_requester) ?? false}
          />
        </View>
      ) : (
        <View style={[styles.noDuty, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="calendar-clear-outline" size={16} color={colors.textMuted} />
          <ThemedText type="small" themeColor="textSecondary">
            No upcoming bazar duty assigned to you
          </ThemedText>
        </View>
      )}

      {/* QUICK ACTIONS (spec §3) */}
      <SectionLabel>QUICK ACTIONS</SectionLabel>
      <View style={styles.quickGrid}>
        <QuickAction icon="restaurant-outline" label="Meals" tint={colors.primary} onPress={() => router.push({ pathname: '/mess/[id]/meals', params: { id: String(id) } } as never)} />
        <QuickAction icon="cart-outline" label="Bazar" tint={colors.success} onPress={() => router.push({ pathname: '/mess/[id]/bazar', params: { id: String(id) } } as never)} />
        <QuickAction icon="receipt-outline" label="Expenses" tint={colors.warning} onPress={() => router.push({ pathname: '/mess/[id]/expenses', params: { id: String(id) } } as never)} />
        <QuickAction icon="document-text-outline" label="Settlement" tint={colors.primaryDark} onPress={() => router.push({ pathname: '/mess/[id]/settlement', params: { id: String(id) } } as never)} />
      </View>

      {/* Exchange flow (spec §9) */}
      <ExchangeSheet
        messId={String(id)}
        myDutyId={my_next_duty?.id ?? null}
        myDutyDate={my_next_duty?.duty_date ?? null}
        visible={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
      />
    </MessScreen>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

function QuickAction({ icon, label, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickTile,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <ThemedText type="small" themeColor="bodyStrong">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ActionButton({
  label,
  tone,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  tone: 'solid' | 'outline' | 'outline-danger';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = useTheme();
  const fg = tone === 'solid' ? colors.onPrimary : tone === 'outline-danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionBtn,
        tone === 'solid'
          ? { backgroundColor: colors.primary }
          : {
              borderWidth: 1,
              borderColor: tone === 'outline-danger' ? colors.danger : colors.border,
              backgroundColor: tone === 'outline-danger' ? `${colors.danger}10` : 'transparent',
            },
        (disabled || loading) && styles.actionDisabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={[styles.actionLabel, { color: fg }]}>{loading ? '…' : label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  gear: {
    padding: 6,
  },
  announce: {
    flexDirection: 'row',
    gap: Spacing.three - 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three - 4,
    alignItems: 'flex-start',
  },
  announceText: {
    flex: 1,
    gap: 2,
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
  todayCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three - 6,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mealRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mealChip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
  mealChipLocked: {
    opacity: 0.6,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  stat: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  },
  statLabel: {
    textAlign: 'center',
  },
  statValue: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  balanceStat: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
    borderRadius: 12,
  },
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
  },
  dutyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    flex: 1,
  },
  dutyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyDate: {
    fontSize: 15,
    lineHeight: 20,
  },
  noDuty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 14,
    padding: Spacing.three,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  quickTile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
