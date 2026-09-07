'use client';

import { useActionState } from 'react';

import { setTutorVerified, type TuitionActionState } from './actions';

interface VerifyButtonProps {
  tutorId: string;
  tutorName: string;
  verified: boolean;
}

/** Verify / un-verify quick action for the tutors table (spec §7). */
export function VerifyButton({ tutorId, tutorName, verified }: VerifyButtonProps) {
  const [state, formAction, isPending] = useActionState<TuitionActionState, FormData>(
    setTutorVerified,
    {},
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="tutorId" value={tutorId} />
      <input type="hidden" name="verified" value={verified ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={isPending}
        className={
          verified
            ? 'h-8 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50'
            : 'h-8 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50'
        }
      >
        {isPending ? 'Saving…' : verified ? 'Un-verify' : 'Verify'}
      </button>
      {state.error && (
        <span className="text-xs text-red-600">
          {tutorName}: {state.error}
        </span>
      )}
    </form>
  );
}
