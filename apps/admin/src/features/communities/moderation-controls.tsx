'use client';

import { useActionState } from 'react';

import {
  deleteCommunityPostAction,
  setCommunityStatus,
  type CommunityActionState,
} from './actions';

interface StatusToggleProps {
  communityId: string;
  current: 'active' | 'hidden' | 'removed';
}

export function CommunityStatusToggle({ communityId, current }: StatusToggleProps) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    setCommunityStatus,
    {},
  );
  const next: 'active' | 'hidden' = current === 'active' ? 'hidden' : 'active';

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        disabled={isPending}
        className={
          current === 'active'
            ? 'h-8 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50'
            : 'h-8 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50'
        }
      >
        {isPending ? 'Saving…' : current === 'active' ? 'Hide' : 'Activate'}
      </button>
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}

interface DeletePostButtonProps {
  postId: string;
}

export function DeleteCommunityPostButton({ postId }: DeletePostButtonProps) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    deleteCommunityPostAction,
    {},
  );

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
