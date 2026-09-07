import { OPPORTUNITY_STATUS_LABELS } from '@kse/shared';
import type { OpportunityStatus } from '@kse/types';

const TONES: Record<OpportunityStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  pending_review: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-zinc-100 text-zinc-500',
  archived: 'bg-zinc-200 text-zinc-600',
};

/** Colored pill for content workflow states (spec §21). */
export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status]}`}
    >
      {OPPORTUNITY_STATUS_LABELS[status]}
    </span>
  );
}
