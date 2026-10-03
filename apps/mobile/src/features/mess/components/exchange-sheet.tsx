/**
 * Bazar duty exchange flow (spec §9): my duty → pick a member → their next
 * duty → send request. The other member accepts/rejects from their home or
 * the bazar screen; the server swaps the dates atomically.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { alertInfo } from '@/lib/dialogs';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBazarDuties, useRequestExchange } from '@/features/mess/queries';
import { Sheet } from './sheet';
import { formatDayMonth, formatWeekday, monthRangeFrom, dhakaToday } from '../lib/dates';

interface ExchangeSheetProps {
  messId: string;
  myDutyId: string | null;
  myDutyDate: string | null;
  visible: boolean;
  onClose: () => void;
}

export function ExchangeSheet({ messId, myDutyId, myDutyDate, visible, onClose }: ExchangeSheetProps) {
  const colors = useTheme();
  const { start, end } = monthRangeFrom(0);
  const { data: duties, isLoading } = useBazarDuties(messId, start, end);
  const requestExchange = useRequestExchange();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const today = dhakaToday();

  /** Other members' upcoming duties: earliest duty per member. */
  const options = useMemo(() => {
    const byMember = new Map<string, { userId: string; name: string; dutyId: string; dutyDate: string }>();
    for (const d of duties ?? []) {
      if (!d.user_id || d.id === myDutyId) continue;
      if (d.duty_date < today) continue;
      const existing = byMember.get(d.user_id);
      if (!existing || d.duty_date < existing.dutyDate) {
        byMember.set(d.user_id, {
          userId: d.user_id,
          name: d.user?.full_name ?? 'Member',
          dutyId: d.id,
          dutyDate: d.duty_date,
        });
      }
    }
    return Array.from(byMember.values()).sort((a, b) => a.dutyDate.localeCompare(b.dutyDate));
  }, [duties, myDutyId, today]);

  const selected = options.find((o) => o.userId === selectedUserId) ?? null;

  const send = () => {
    if (!myDutyId || !selected) return;
    requestExchange.mutate(
      {
        mess_id: messId,
        requester_duty_id: myDutyId,
        target_id: selected.userId,
        target_duty_id: selected.dutyId,
      },
      {
        onSuccess: () => {
          alertInfo(
            'Request sent',
            `${selected.name} will be asked to swap their ${formatDayMonth(selected.dutyDate)} duty with your ${formatDayMonth(myDutyDate ?? '')} duty.`,
          );
          setSelectedUserId(null);
          onClose();
        },
        onError: (e) => alertInfo('Could not send request', (e as Error).message),
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={() => { setSelectedUserId(null); onClose(); }} title="Exchange Duty">
      {/* My duty */}
      <View style={[styles.block, { backgroundColor: colors.surfaceMuted }]}>
        <ThemedText type="small" themeColor="textSecondary">
          My duty
        </ThemedText>
        {myDutyDate ? (
          <>
            <ThemedText type="smallBold" style={styles.date}>
              {formatDayMonth(myDutyDate)}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {formatWeekday(myDutyDate)}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            You have no upcoming duty to exchange.
          </ThemedText>
        )}
      </View>

      {myDutyId ? (
        <>
          <View style={styles.pickerHead}>
            <Ionicons name="swap-vertical-outline" size={16} color={colors.textSecondary} />
            <ThemedText type="smallBold">Exchange with</ThemedText>
          </View>

          {isLoading ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Loading duties…
            </ThemedText>
          ) : options.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              No other member has an upcoming duty to swap with.
            </ThemedText>
          ) : (
            <ScrollView style={styles.options} bounces={false}>
              {options.map((o) => {
                const active = o.userId === selectedUserId;
                return (
                  <Pressable
                    key={o.userId}
                    onPress={() => setSelectedUserId(o.userId)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Exchange with ${o.name}, their duty ${formatDayMonth(o.dutyDate)}`}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: active ? `${colors.primary}14` : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionMeta}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {o.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Their duty · {formatDayMonth(o.dutyDate)}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={active ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <PrimaryButton
            label={selected ? `Send Request to ${selected.name}` : 'Select a Member'}
            disabled={!selected}
            loading={requestExchange.isPending}
            onPress={send}
            style={styles.send}
          />
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            They can accept or reject from their mess home. On acceptance the duty dates swap automatically.
          </ThemedText>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: 2,
    marginBottom: Spacing.three - 6,
  },
  date: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 17,
    lineHeight: 24,
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  options: {
    gap: Spacing.two,
    maxHeight: 280,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three - 4,
  },
  optionMeta: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  send: {
    marginTop: Spacing.three,
  },
  hint: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});
