import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { narrowWeekdays } from '../lib/dates';
import type { MealCalendarEntry, MealType } from '@kse/types';

interface MealCalendarProps {
  /** `YYYY-MM-01` */
  monthStart: string;
  entries: MealCalendarEntry[];
  selectedDate: string;
  onSelect: (dateISO: string) => void;
  today: string;
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];

/**
 * Monthly meal calendar (spec §6): one row per week, three status dots per
 * day (breakfast/lunch/dinner). Filled dot = ON, hollow = OFF, no dots =
 * nothing recorded yet. Past days dim; today gets a ring.
 */
export function MealCalendar({ monthStart, entries, selectedDate, onSelect, today }: MealCalendarProps) {
  const colors = useTheme();
  const byDate = new Map(entries.map((e) => [e.date, e]));

  const [year, month] = monthStart.split('-').map(Number);
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weekdays = narrowWeekdays();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {weekdays.map((d, i) => (
          <ThemedText key={i} style={[styles.weekday, { color: colors.textMuted }]}>
            {d}
          </ThemedText>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <View key={w} style={styles.weekRow}>
          {cells.slice(w * 7, w * 7 + 7).map((day, di) => {
            if (day === null) return <View key={di} style={styles.cell} />;
            const dateISO = `${monthStart.slice(0, 8)}${String(day).padStart(2, '0')}`;
            const entry = byDate.get(dateISO);
            const isToday = dateISO === today;
            const isSelected = dateISO === selectedDate;
            const isPast = dateISO < today;

            return (
              <Pressable
                key={di}
                onPress={() => onSelect(dateISO)}
                accessibilityRole="button"
                accessibilityLabel={`${dateISO}${entry ? `, ${entry.total} meals on` : ', no meal records'}`}
                style={({ pressed }) => [
                  styles.cell,
                  styles.day,
                  { backgroundColor: colors.background },
                  isSelected && { backgroundColor: `${colors.primary}1A` },
                  isPast && styles.past,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.dayNum,
                    { color: isPast ? colors.textMuted : colors.text },
                    isToday && [styles.todayNum, { color: colors.primary, borderColor: colors.primary }],
                  ]}
                >
                  {day}
                </ThemedText>
                <View style={styles.dots}>
                  {MEAL_ORDER.map((mt) => {
                    const state = entry?.[mt];
                    if (state === null || state === undefined) {
                      return <View key={mt} style={[styles.dot, styles.dotNone]} />;
                    }
                    return state === 'on' ? (
                      <View key={mt} style={[styles.dot, { backgroundColor: colors.success }]} />
                    ) : (
                      <View
                        key={mt}
                        style={[styles.dot, { borderWidth: 1, borderColor: colors.textMuted }]}
                      />
                    );
                  })}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <LegendDot filled colors={colors} label="ON" />
        <LegendDot colors={colors} label="OFF" />
        <View style={styles.legendItem}>
          <ThemedText style={[styles.legendText, { color: colors.textMuted }]}>· today</ThemedText>
        </View>
      </View>
    </View>
  );
}

function LegendDot({ filled, colors, label }: { filled?: boolean; colors: ReturnType<typeof useTheme>; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.dot,
          filled ? { backgroundColor: colors.success } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textMuted },
        ]}
      />
      <ThemedText style={[styles.legendText, { color: colors.textMuted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
  },
  day: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
  },
  past: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
  dayNum: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  todayNum: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 5,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    minHeight: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  dotNone: {
    opacity: 0,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
