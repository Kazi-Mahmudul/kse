/**
 * Meal cut-off logic — client mirror of the DB `can_modify_meal()` function
 * (supabase/migrations/20260928000003_mess_meals.sql).
 *
 * Used ONLY to render UI state (enabled/disabled, "closed" labels). The
 * server enforces the real rule in the `set_meal` edge action + RLS; this
 * mirror must stay in sync with the SQL.
 */

import type { MealCutoffSettings, MealType } from '@kse/types';
import { dhakaInstant, dhakaToday } from './dates';

/** Meal serving times used by the DB when computing minutes-based cut-offs. */
const MEAL_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '20:00',
};

const CUTOFF_MINUTES: Record<MealType, number> = {
  breakfast: 30,
  lunch: 60,
  dinner: 120,
};

const CUTOFF_TIME_FIELD: Record<MealType, keyof MealCutoffSettings> = {
  breakfast: 'breakfast_cutoff_time',
  lunch: 'lunch_cutoff_time',
  dinner: 'dinner_cutoff_time',
};

const CUTOFF_MINUTES_FIELD: Record<MealType, keyof MealCutoffSettings> = {
  breakfast: 'breakfast_cutoff_minutes',
  lunch: 'lunch_cutoff_minutes',
  dinner: 'dinner_cutoff_minutes',
};

export interface CutoffInfo {
  /** The cut-off instant, or null when no settings exist (permissive). */
  at: Date | null;
  /** True when the meal can still be changed now (server-enforced too). */
  canModify: boolean;
  /** "until 4:00 PM" for open windows, "closed at 4:00 PM" after. */
  label: string;
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  });
}

/** Compute the cut-off for one meal on one Dhaka-local date. */
export function mealCutoff(
  dateISO: string,
  mealType: MealType,
  settings: MealCutoffSettings | null | undefined,
  now: Date = new Date(),
): CutoffInfo {
  if (!settings) {
    // DB returns true when no settings row exists — permissive.
    return { at: null, canModify: true, label: '' };
  }

  const cutoffTime = settings[CUTOFF_TIME_FIELD[mealType]] as string | null;
  const minutes = (settings[CUTOFF_MINUTES_FIELD[mealType]] as number | null) ?? CUTOFF_MINUTES[mealType];

  let at: Date;
  if (cutoffTime) {
    // Specific Dhaka time; breakfast cut-off is on the previous day.
    const day = mealType === 'breakfast'
      ? shiftDate(dateISO, -1)
      : dateISO;
    at = dhakaInstant(day, cutoffTime.slice(0, 5));
  } else {
    at = dhakaInstant(dateISO, MEAL_TIMES[mealType]);
    at = new Date(at.getTime() - minutes * 60_000);
  }

  const canModify = now.getTime() < at.getTime();
  return {
    at,
    canModify,
    label: canModify ? `until ${timeLabel(at)}` : `closed at ${timeLabel(at)}`,
  };
}

function shiftDate(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether a calendar day is editable at all: future days always are, today
 * depends on each meal's cut-off, past days never are.
 */
export function isPastDay(dateISO: string, today = dhakaToday()): boolean {
  return dateISO < today;
}
