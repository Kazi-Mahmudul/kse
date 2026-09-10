/** Deadline/date display helpers (no date lib — stays tiny). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Whole days from now until the deadline (negative once passed). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.floor(diff / MS_PER_DAY);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'No deadline';
  return dateFormat.format(new Date(iso));
}

/** Time-of-day in 12-hour format, e.g. "10:00 AM". */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return timeFormat.format(new Date(iso));
}

/** Combined date + time for event cards ("18 May 2024 • 10:00 AM").
 *  Falls back to date-only when the time portion is midnight (suggests a
 *  date-only column) so the row reads naturally. */
export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const date = dateFormat.format(d);
  const time = timeFormat.format(d);
  // If the time component is exactly midnight, the column is date-only —
  // skip the time bullet so we don't show "1 Jan 1970 • 12:00 AM".
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return date;
  return `${date} • ${time}`;
}

/** Compact countdown label for cards and detail headers. */
export function deadlineLabel(iso: string | null | undefined): string {
  const days = daysUntil(iso);
  if (days === null) return 'Open';
  if (days < 0) return 'Closed';
  if (days === 0) return 'Ends today';
  if (days === 1) return '1 day left';
  if (days <= 30) return `${days} days left`;
  const months = Math.round(days / 30);
  return months <= 1 ? '1 month left' : `${months} months left`;
}

/** Chip tone for a deadline: danger when passed, warning when soon. */
export function deadlineTone(iso: string | null | undefined): 'danger' | 'warning' | 'neutral' {
  const days = daysUntil(iso);
  if (days === null) return 'neutral';
  if (days < 0) return 'danger';
  if (days <= 7) return 'warning';
  return 'neutral';
}
