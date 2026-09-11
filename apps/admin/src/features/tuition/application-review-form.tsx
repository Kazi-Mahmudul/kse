'use client';

import { useActionState } from 'react';

import { reviewTutorApplication, type TuitionActionState } from './actions';

interface ApplicationReviewFormProps {
  applicationId: string;
  applicantName: string;
}

/**
 * Approve / reject a pending tutor application. Both buttons submit the same
 * form; the clicked one's `decision` value tells the action apart. Approving
 * creates the verified tutor listing (see reviewTutorApplication).
 */
export function ApplicationReviewForm({
  applicationId,
  applicantName,
}: ApplicationReviewFormProps) {
  const [state, formAction, isPending] = useActionState<TuitionActionState, FormData>(
    reviewTutorApplication,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input
        name="reviewNote"
        placeholder="Note to applicant (optional, shown on rejection)"
        className="h-8 w-64 max-w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={isPending}
          className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPending ? 'Working…' : 'Approve'}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={isPending}
          className="h-8 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {state.error && (
        <span className="text-xs text-red-600">
          {applicantName}: {state.error}
        </span>
      )}
    </form>
  );
}
