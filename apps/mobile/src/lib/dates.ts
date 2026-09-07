/** Deadline/date display helpers (no date lib — stays tiny). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
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
