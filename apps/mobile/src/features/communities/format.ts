/**
 * Shared formatting helpers for community-related surfaces (spec
 * 09._community_kse). Single source of truth so the tile card and any
 * future count badges stay aligned.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact relative-time string ("just now", "5m ago", "3h ago", "2d ago",
 * "Mar 4"). Matches the spec ("2h ago") and the existing PostCard footer
 * pattern. Returns "just now" for anything under a minute.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Compact member-count formatter — mirrors the spec ("1.2K Members",
 * "3.5K Members", "2.8K Members"…). Falls back to a plain int for
 * sub-1k counts ("450 Members"). No localization yet (en-US only).
 */
export function formatMemberCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count < 1_000) return String(Math.round(count));
  const thousands = count / 1_000;
  // 1 decimal max, but drop the trailing ".0" so "1K" not "1.0K".
  const rounded = Math.round(thousands * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}K`;
}

/**
 * Event date/time line: "Sat, 12 Sep · 4:00 PM" (same-day events also show
 * "Today"/"Tomorrow" prefixes). Falls back to a locale string.
 */
export function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(date) - startOfDay(today)) / 86_400_000);
  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Tomorrow · ${time}`;
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${time}`;
}
