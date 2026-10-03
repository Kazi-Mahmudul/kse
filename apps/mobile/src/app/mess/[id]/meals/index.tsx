/**
 * Meals — today's meal management + monthly calendar (spec §4–§6).
 * The date header shows the selected day; the three big toggle cards act
 * on it. Past days are locked; today's cards disable themselves after the
 * cut-off with a clear "closed" explanation.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { alertInfo } from '@/lib/dialogs';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocalSearchParams } from 'expo-router';
import {
  useMealCalendar,
  useMealCutoffSettings,
  useMealStats,
  useToggleMeal,
} from '@/features/mess/queries';
import { MessScreen } from '@/features/mess/components/mess-screen';
import { MealToggleCard } from '@/features/mess/components/meal-toggle-card';
import { MealCalendar } from '@/features/mess/components/meal-calendar';
import { MonthSwitcher } from '@/features/mess/components/month-switcher';
import { SectionLabel } from '@/features/mess/components/section-label';
import { ErrorBox, InlineLoading } from '@/features/mess/components/list-state';
import { mealCutoff, isPastDay } from '@/features/mess/lib/cutoff';
import { dhakaToday, formatWeekday, monthRangeFrom } from '@/features/mess/lib/dates';
import type { MealType } from '@kse/types';

export default function MealsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const messId = String(id ?? '');

  const today = dhakaToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthOffset, setMonthOffset] = useState(0);
  const month = monthRangeFrom(monthOffset);

  const { data: cutoffSettings } = useMealCutoffSettings(messId);
  const { data: calendar, isLoading, isError, error, refetch } = useMealCalendar(messId, month.start, month.end);
  const { data: stats } = useMealStats(messId, month.start, month.end, 'me');
  const toggleMeal = useToggleMeal();

  const entry = calendar?.find((e) => e.date === selectedDate) ?? null;
  const isCurrentMonth = monthOffset === 0;

  const monthName = month.label.split(' ')[0];
  const selDay = String(Number(selectedDate.split('-')[2]));

  const handleToggle = (mealType: MealType, next: 'on' | 'off') => {
    toggleMeal.mutate(
      { mess_id: messId, meal_date: selectedDate, meal_type: mealType, state: next },
      {
        onError: (e) =>
          alertInfo(
          'Meal not changed',
          (e as Error).message.includes('closed')
            ? 'The change window for this meal has closed.'
            : (e as Error).message,
        ),
      },
    );
  };

  return (
    <MessScreen messId={messId} active="meals" onRefresh={() => refetch()}>
      {/* Selected day header (spec §4) */}
      <View style={styles.dayHeader}>
        <View>
          <ThemedText style={styles.dayBig}>
            {monthName} {selDay}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatWeekday(selectedDate)}
            {selectedDate !== today ? ' · viewing another day' : ''}
          </ThemedText>
        </View>
        {selectedDate !== today ? (
          <ThemedText
            type="small"
            themeColor="primary"
            onPress={() => {
              setSelectedDate(today);
              setMonthOffset(0);
            }}
            style={styles.backToToday}
          >
            Back to today
          </ThemedText>
        ) : null}
      </View>

      {/* Three large interactive meal cards (spec §4–5) */}
      <View style={styles.cards}>
        {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mt) => {
          const state = entry?.[mt] ?? 'off';
          const info = mealCutoff(selectedDate, mt, cutoffSettings);
          return (
            <MealToggleCard
              key={mt}
              mealType={mt}
              state={state}
              cutoffLabel={info.label}
              canToggle={info.canModify && !isPastDay(selectedDate)}
              disabled={toggleMeal.isPending}
              onToggle={(next) => handleToggle(mt, next)}
            />
          );
        })}
      </View>

      {/* Calendar (spec §6) */}
      <SectionLabel>CALENDAR</SectionLabel>
      <View style={[styles.calendarCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <MonthSwitcher
          label={month.label}
          onPrev={() => setMonthOffset((m) => m - 1)}
          onNext={() => setMonthOffset((m) => Math.min(m + 1, 0))}
          nextDisabled={isCurrentMonth}
        />
        <View style={styles.calendarWrap}>
          {isLoading ? (
            <InlineLoading />
          ) : isError ? (
            <ErrorBox message={error?.message ?? 'Could not load the calendar.'} onRetry={() => refetch()} />
          ) : (
            <MealCalendar
              monthStart={month.start}
              entries={calendar ?? []}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              today={today}
            />
          )}
        </View>
      </View>

      {/* Monthly summary (spec §6) */}
      <SectionLabel>THIS MONTH · MY MEALS</SectionLabel>
      <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <SummaryStat label="Breakfast" value={stats?.breakfast ?? 0} color={colors.warning} />
        <Divider />
        <SummaryStat label="Lunch" value={stats?.lunch ?? 0} color={colors.primary} />
        <Divider />
        <SummaryStat label="Dinner" value={stats?.dinner ?? 0} color={colors.primaryDark} />
        <Divider />
        <SummaryStat label="Total" value={stats?.total ?? 0} color={colors.success} bold />
      </View>
    </MessScreen>
  );
}

function SummaryStat({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <View style={styles.summaryStat}>
      <ThemedText style={[bold ? styles.summaryValueBold : styles.summaryValue, { color }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const colors = useTheme();
  return <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayBig: {
    fontFamily: FontFamilies.bold,
    fontSize: 26,
    lineHeight: 32,
  },
  backToToday: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cards: {
    gap: Spacing.three - 6,
  },
  calendarCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  calendarWrap: {
    // keeps the calendar compact inside the card
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 26,
  },
  summaryValueBold: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
