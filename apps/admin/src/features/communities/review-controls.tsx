'use client';

import { useActionState } from 'react';

import {
  approveCommunityRequestAction,
  rejectCommunityRequestAction,
  resolveReportAction,
  type CommunityActionState,
} from './actions';

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 outline-none transition focus:border-indigo-600';

/** Approve a creation request — creates the community with the requester as owner. */
export function ApproveRequestForm({
  requestId,
  suggestedSlug,
}: {
  requestId: string;
  suggestedSlug: string;
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    approveCommunityRequestAction,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="requestId" value={requestId} />
      <input
        name="slug"
        defaultValue={suggestedSlug}
        placeholder="community-slug"
        aria-label="Slug for the new community"
        className={inputClass}
      />
      <input
        name="reviewNote"
        placeholder="Note to requester (optional)"
        aria-label="Review note"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {isPending ? 'Approving…' : 'Approve & create'}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function RejectRequestForm({ requestId }: { requestId: string }) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    rejectCommunityRequestAction,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="requestId" value={requestId} />
      <input
        name="reviewNote"
        placeholder="Reason (required)"
        aria-label="Rejection reason"
        className={inputClass}
        required
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-9 rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Rejecting…' : 'Reject'}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

/** Resolve or dismiss a report, optionally removing the reported content. */
export function ResolveReportForm({
  reportId,
  targetType,
  targetId,
  canRemoveTarget,
}: {
  reportId: string;
  targetType: string;
  targetId: string;
  canRemoveTarget: boolean;
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    resolveReportAction,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input
        name="note"
        placeholder="Resolution note (optional)"
        aria-label="Resolution note"
        className={inputClass}
      />
      {canRemoveTarget && (
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input type="checkbox" name="removeTarget" className="accent-indigo-600" />
          Also remove the reported content
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="outcome"
          value="resolved"
          disabled={isPending}
          className="h-9 flex-1 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Resolve'}
        </button>
        <button
          type="submit"
          name="outcome"
          value="dismissed"
          disabled={isPending}
          className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
