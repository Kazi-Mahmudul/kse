/**
 * Mess date helpers — Asia/Dhaka wall-clock.
 *
 * All mess business dates (meal days, bazar dates, month boundaries) are
 * Dhaka-local dates. Device clocks may be in any timezone, so "today" is
 * computed as UTC+6 (Bangladesh has no DST) rather than from the device.
 */

/** Dhaka offset in minutes — fixed UTC+6, no DST. */
const DHAKA_OFFSET_MIN = 6 * 60;

/** Current date in Dhaka as ISO `YYYY-MM-DD`. */
export function dhakaToday(): string {
  return dhakaDateFrom(new Date());
}

/** Convert any instant to its Dhaka-local calendar date `YYYY-MM-DD`. */
export function dhakaDateFrom(instant: Date): string {
  const dhaka = new Date(instant.getTime() + DHAKA_OFFSET_MIN * 60_000);
  return dhaka.toISOString().slice(0, 10);
}

/** Parse a Dhaka-local `YYYY-MM-DD` at the given wall-clock time to a UTC instant. */
export function dhakaInstant(dateISO: string, time = '00:00'): Date {
  return new Date(`${dateISO}T${time}:00.000+06:00`);
}

export interface MonthRange {
  /** `YYYY-MM-01` */
  start: string;
  /** Last day of the month, `YYYY-MM-DD` */
  end: string;
  /** `YYYY-MM` */
  key: string;
  /** e.g. "September 2026" */
  label: string;
  /** e.g. "Sep 2026" */
  shortLabel: string;
}

/** Month range for `offset` months from the current Dhaka month (0 = this month). */
export function monthRangeFrom(offset = 0): MonthRange {
  const today = dhakaToday();
  const [y, m] = today.split('-').map(Number);
  // month is 0-based; Date(YYYY, MM, 0) normalises overflow/underflow.
  const base = new Date(Date.UTC(y, m - 1 + offset, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortLabel = base.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { start, end, key: `${year}-${String(month + 1).padStart(2, '0')}`, label, shortLabel };
}

/** `YYYY-MM` key of a Dhaka-local `YYYY-MM-DD`. */
export function monthKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

const DAY_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });
const DOW_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' });

/** "29 Sep" from a plain date string (no timezone drift — parsed as UTC noon). */
export function formatDayMonth(dateISO: string): string {
  return DAY_FMT.format(new Date(`${dateISO}T12:00:00Z`));
}

/** "Tuesday" from a plain date string. */
export function formatWeekday(dateISO: string): string {
  return WEEKDAY_FMT.format(new Date(`${dateISO}T12:00:00Z`));
}

/** Narrow weekday letters for calendar headers: S M T W T F S. */
export function narrowWeekdays(): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => DOW_FMT.format(new Date(Date.UTC(2024, 8, 1 + d))));
}

/** "Today", "Tomorrow", "Yesterday" or "29 Sep". */
export function relativeDayLabel(dateISO: string, today = dhakaToday()): string {
  const t = new Date(`${today}T12:00:00Z`).getTime();
  const d = new Date(`${dateISO}T12:00:00Z`).getTime();
  const diffDays = Math.round((d - t) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return formatDayMonth(dateISO);
}

/** Days from today (negative = past) for a Dhaka-local date. */
export function daysFromToday(dateISO: string, today = dhakaToday()): number {
  const t = new Date(`${today}T12:00:00Z`).getTime();
  const d = new Date(`${dateISO}T12:00:00Z`).getTime();
  return Math.round((d - t) / 86_400_000);
}
