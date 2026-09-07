/** Display formatting helpers. */

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateTimeFmt.format(new Date(iso));
}

/** ISO timestamp → datetime-local input value ("2026-09-15T17:00"). */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
