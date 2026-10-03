/**
 * Bazar Duty Calendar (spec §8): who buys on which day. The member's own
 * duties are highlighted so "when do I have to buy?" is answered at a
 * glance. Managers can assign, reassign and remove duties.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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
  useBazarDuties,
  useDeleteBazarDuty,
  useMessDetail,
  useMessMembers,
  useUpsertBazarDuty,
} from '@/features/mess/queries';
import { MonthSwitcher } from '@/features/mess/components/month-switcher';
import { Sheet } from '@/features/mess/components/sheet';
import { StatusBadge } from '@/features/mess/components/status-badge';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { dhakaToday, monthRangeFrom, daysFromToday, formatWeekday } from '@/features/mess/lib/dates';
import { useAuthStore } from '@/store/auth-store';
import type { BazarDuty } from '@kse/types';

export default function DutyCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const messId = String(id ?? '');
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const [monthOffset, setMonthOffset] = useState(0);
  const month = monthRangeFrom(monthOffset);
  const today = dhakaToday();

  const { data: duties, isLoading, isError, error, refetch, isRefetching } = useBazarDuties(messId, month.start, month.end);
  const { data: mess } = useMessDetail(messId);
  const { data: members } = useMessMembers(messId);
  const upsertDuty = useUpsertBazarDuty();
  const deleteDuty = useDeleteBazarDuty();

  const isManager = mess?.manager_id === currentUserId;
  const [reassigning, setReassigning] = useState<BazarDuty | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.status === 'active'),
    [members],
  );

  const rows = useMemo(() => {
    const byDate = new Map<string, BazarDuty[]>();
    for (const d of duties ?? []) {
      if (!byDate.has(d.duty_date)) byDate.set(d.duty_date, []);
      byDate.get(d.duty_date)!.push(d);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayDuties]) => ({ date, dayDuties }));
  }, [duties]);

  const saveDuty = (memberUserId: string, dutyDate: string, dutyId?: string) => {
    upsertDuty.mutate(
      { messId, memberUserId, dutyDate, dutyId },
      {
        onSuccess: () => {
          setReassigning(null);
          setAssignOpen(false);
        },
        onError: (e) => alertInfo('Could not save duty', (e as Error).message),
      },
    );
  };

  const handleRemove = (duty: BazarDuty) => {
    alertConfirm(
      'Remove duty?',
      `The bazar duty on ${duty.duty_date} will be removed. Pending exchanges for it are cancelled.`,
      () =>
        deleteDuty.mutate(
          { dutyId: duty.id },
          { onError: (e) => alertInfo('Could not remove duty', (e as Error).message) },
        ),
      { confirmLabel: 'Remove', destructive: true },
    );
  };

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      <BackHeader title="Duty Calendar" />

      <MonthSwitcher
        label={month.label}
        onPrev={() => setMonthOffset((m) => m - 1)}
        onNext={() => setMonthOffset((m) => Math.min(m + 1, 0))}
        nextDisabled={monthOffset === 0}
      />

      {isManager ? <PrimaryButton label="+ Assign Duty" onPress={() => setAssignOpen(true)} /> : null}

      {isLoading ? (
        <InlineLoading />
      ) : isError ? (
        <ErrorBox message={error?.message ?? 'Could not load duties.'} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No duties scheduled"
          message={
            isManager
              ? 'Assign the first bazar duty for this month.'
              : 'Your manager hasn’t scheduled duties for this month yet.'
          }
          actionLabel={isManager ? 'Assign Duty' : undefined}
          onAction={isManager ? () => setAssignOpen(true) : undefined}
        />
      ) : (
        <View style={styles.list}>
          {rows.map(({ date, dayDuties }) => {
            const dayNum = date.split('-')[2];
            const diff = daysFromToday(date, today);
            const isToday = diff === 0;
            return (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHead}>
                  <View style={[styles.dateBlock, isToday && { borderColor: colors.primary }]}>
                    <ThemedText style={[styles.dayNum, isToday && { color: colors.primary }]}>
                      {dayNum}
                    </ThemedText>
                    <ThemedText themeColor="textMuted" style={styles.weekday}>
                      {formatWeekday(date).slice(0, 3)}
                    </ThemedText>
                  </View>
                  {isToday ? <StatusBadge label="Today" tone="pending" /> : null}
                </View>

                {dayDuties.map((duty) => {
                  const mine = duty.user_id === currentUserId;
                  return (
                    <View
                      key={duty.id}
                      style={[
                        styles.dutyRow,
                        {
                          backgroundColor: mine ? `${colors.primary}12` : colors.background,
                          borderColor: mine ? `${colors.primary}44` : colors.border,
                        },
                      ]}
                      accessibilityLabel={`Bazar on ${date}: ${duty.user?.full_name ?? 'member'}${mine ? ' (you)' : ''}`}
                    >
                      <ProfileAvatar
                        name={duty.user?.full_name ?? '?'}
                        url={duty.user?.avatar_url ?? undefined}
                        size={32}
                        ringSize={1}
                      />
                      <ThemedText type="small" numberOfLines={1} style={styles.dutyName}>
                        {duty.user?.full_name ?? 'Unknown'}
                      </ThemedText>
                      {mine ? <StatusBadge label="You" tone="manager" /> : null}
                      {isManager ? (
                        <View style={styles.managerBtns}>
                          <Pressable
                            onPress={() => setReassigning(duty)}
                            accessibilityRole="button"
                            accessibilityLabel="Reassign duty"
                            hitSlop={6}
                            style={({ pressed }) => [styles.miniBtn, pressed && styles.pressed]}
                          >
                            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleRemove(duty)}
                            accessibilityRole="button"
                            accessibilityLabel="Remove duty"
                            hitSlop={6}
                            style={({ pressed }) => [styles.miniBtn, pressed && styles.pressed]}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

      {/* Manager: assign a new duty (member + date) */}
      <MemberPickSheet
        visible={assignOpen}
        title="Assign Duty"
        members={activeMembers.map((m) => ({ id: m.user_id, name: m.user_name ?? 'Member' }))}
        loading={upsertDuty.isPending}
        initialDate={today}
        onClose={() => setAssignOpen(false)}
        onConfirm={(memberUserId, date) => saveDuty(memberUserId, date)}
      />

      {/* Manager: reassign an existing duty (member only, date kept) */}
      <MemberPickSheet
        visible={reassigning !== null}
        title={`Reassign ${reassigning?.duty_date ?? ''}`}
        members={activeMembers.map((m) => ({ id: m.user_id, name: m.user_name ?? 'Member' }))}
        loading={upsertDuty.isPending}
        lockedDate={reassigning?.duty_date}
        onClose={() => setReassigning(null)}
        onConfirm={(memberUserId, date) => {
          if (reassigning) saveDuty(memberUserId, date, reassigning.id);
        }}
      />
    </Screen>
  );
}

// ── Member picker sheet ──────────────────────────────────────────────────────

function MemberPickSheet({
  visible,
  title,
  members,
  loading,
  onClose,
  onConfirm,
  initialDate,
  lockedDate,
}: {
  visible: boolean;
  title: string;
  members: { id: string; name: string }[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (memberUserId: string, date: string) => void;
  /** Editable date for new assignments (defaults to today). */
  initialDate?: string;
  /** Fixed date shown when reassigning an existing duty. */
  lockedDate?: string;
}) {
  const colors = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(initialDate ?? '');

  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim());

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.dateField}>
        <ThemedText type="small" themeColor="textSecondary">
          Duty date
        </ThemedText>
        {lockedDate ? (
          <View style={[styles.dateLocked, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small">{lockedDate}</ThemedText>
          </View>
        ) : (
          <>
            <TextInput
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              style={[styles.dateInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              accessibilityLabel="Duty date"
            />
            {!dateValid ? (
              <ThemedText type="small" themeColor="danger">
                Use the YYYY-MM-DD format
              </ThemedText>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.pickerList}>
        {members.map((m) => {
          const active = m.id === selected;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelected(m.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? `${colors.primary}14` : colors.background,
                  borderColor: active ? colors.primary : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="small" numberOfLines={1} style={styles.optionName}>
                {m.name}
              </ThemedText>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label="Save Duty"
        disabled={!selected || (!lockedDate && !dateValid)}
        loading={loading}
        onPress={() => {
          if (!selected) return;
          onConfirm(selected, lockedDate ?? dateInput.trim());
          setSelected(null);
        }}
        style={styles.confirm}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three - 6,
  },
  dateGroup: {
    gap: Spacing.two,
  },
  dateHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dateBlock: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dayNum: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  weekday: {
    fontSize: 10,
    lineHeight: 12,
  },
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three - 4,
  },
  dutyName: {
    flex: 1,
  },
  managerBtns: {
    flexDirection: 'row',
    gap: 2,
  },
  miniBtn: {
    padding: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  pickerList: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three - 4,
  },
  optionName: {
    flex: 1,
    marginRight: 8,
  },
  dateField: {
    gap: 6,
    marginBottom: Spacing.three - 6,
  },
  dateInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  dateLocked: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  confirm: {
    marginTop: Spacing.three - 6,
  },
});
