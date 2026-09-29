import { HUB_LISTING_STATUS_LABELS } from '@kse/shared';
import type { HubListingStatus } from '@kse/types';

const TONES: Record<HubListingStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  pending_review: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-orange-50 text-orange-700',
  archived: 'bg-zinc-200 text-zinc-600',
};

/** Colored pill for Student Hub listing workflow states (spec student-hub §20). */
export function HubStatusBadge({ status }: { status: HubListingStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status]}`}
    >
      {HUB_LISTING_STATUS_LABELS[status]}
    </span>
  );
}
