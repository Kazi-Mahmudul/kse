/**
 * Deadline helpers shared by mobile and admin.
 * Pure functions — no React Native or DOM APIs.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from now until the deadline (negative once passed). */
export function daysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const time = Date.parse(deadline);
  if (Number.isNaN(time)) return null;
  return Math.floor((time - Date.now()) / MS_PER_DAY);
}

export function isDeadlineActive(deadline: string | null | undefined): boolean {
  const days = daysUntilDeadline(deadline);
  return days === null ? true : days >= 0;
}

/** Deadline urgency buckets used for list badges and reminders. */
export type DeadlineUrgency = 'closed' | 'today' | 'soon' | 'upcoming' | 'none';

export function deadlineUrgency(
  deadline: string | null | undefined,
  soonDays = 7,
): DeadlineUrgency {
  const days = daysUntilDeadline(deadline);
  if (days === null) return 'none';
  if (days < 0) return 'closed';
  if (days === 0) return 'today';
  if (days <= soonDays) return 'soon';
  return 'upcoming';
}
