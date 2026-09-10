/** Money / number formatting helpers. Tiny — no extra deps. */

/**
 * Format a numeric amount as currency using `Intl.NumberFormat`.
 * Uses the supplied ISO-4217 currency code (`BDT`, `USD`, …) when present;
 * falls back to a plain number otherwise (e.g. `8,000`).
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (amount === null || amount === undefined) return null;
  if (!currency) {
    // No code: localised digit grouping only — keep callers in control of
    // their prefix (e.g. "৳8,000").
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(amount);
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Unknown ISO code — degrade to "CODE 8,000" so the row stays readable.
    return `${currency} ${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }
}

/** Deterministic hash for picking a tile color from a string. */
export function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Initialism for a company name (first two graphemes, uppercased). */
export function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // Skip leading whitespace tokens; take the first 2 word-starts.
  const words = trimmed.split(/\s+/).slice(0, 2);
  return words
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}
