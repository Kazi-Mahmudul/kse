'use client';

import { useActionState } from 'react';

import {
  deleteCommunityPostAction,
  removeCommunityContentAction,
  removeMemberAction,
  restoreCommunityContentAction,
  setCommunityStatus,
  setMemberRoleAction,
  type CommunityActionState,
} from './actions';

const idleState: CommunityActionState = {};

function ActionError({ state }: { state: CommunityActionState }) {
  if (!state.error) return null;
  return <span className="text-xs text-red-600">{state.error}</span>;
}

/**
 * Suspend (hidden) / Archive / Activate controls for a community.
 * hidden = suspended (invisible in the app, restorable);
 * archived = terminal (kept for history).
 */
export function CommunityStatusControls({
  communityId,
  current,
}: {
  communityId: string;
  current: 'active' | 'hidden' | 'removed' | 'archived';
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    setCommunityStatus,
    idleState,
  );

  const variants: {
    status: string;
    label: string;
    className: string;
    show: boolean;
  }[] = [
    {
      status: 'active',
      label: 'Activate',
      show: current !== 'active',
      className:
        'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50',
    },
    {
      status: 'hidden',
      label: 'Suspend',
      show: current === 'active',
      className:
        'border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50',
    },
    {
      status: 'archived',
      label: 'Archive',
      show: current !== 'archived',
      className:
        'border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50',
    },
  ];

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {variants
          .filter((variant) => variant.show)
          .map((variant) => (
            <form key={variant.status} action={formAction}>
              <input type="hidden" name="communityId" value={communityId} />
              <input type="hidden" name="status" value={variant.status} />
              <button
                type="submit"
                disabled={isPending}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${variant.className}`}
              >
                {isPending ? 'Saving…' : variant.label}
              </button>
            </form>
          ))}
      </div>
      <ActionError state={state} />
    </div>
  );
}

/** Alias kept for the detail page header (single activate/suspend toggle). */
export const CommunityStatusToggle = CommunityStatusControls;

/** Soft-remove user content (posts, comments, events). */
export function RemoveCommunityContentButton({
  contentType,
  contentId,
  label = 'Remove',
}: {
  contentType: 'community_post' | 'community_comment' | 'community_event';
  contentId: string;
  label?: string;
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    removeCommunityContentAction,
    idleState,
  );
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="contentType" value={contentType} />
      <input type="hidden" name="contentId" value={contentId} />
      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Removing…' : label}
      </button>
      <ActionError state={state} />
    </form>
  );
}

export function DeleteCommunityPostButton({ postId }: { postId: string }) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    deleteCommunityPostAction,
    idleState,
  );
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded-lg border border-red-300 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Delete forever'}
      </button>
      <ActionError state={state} />
    </form>
  );
}

/** Restore soft-removed content from the moderation queue. */
export function RestoreTargetButton({
  contentType,
  id,
  label = 'Restore',
}: {
  contentType: 'community_post' | 'community_comment' | 'community_event';
  id: string;
  label?: string;
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    restoreCommunityContentAction,
    idleState,
  );
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="contentType" value={contentType} />
      <input type="hidden" name="contentId" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
      >
        {isPending ? 'Restoring…' : label}
      </button>
      <ActionError state={state} />
    </form>
  );
}

/** Promote to moderator / demote to member (owners excluded server-side). */
export function MemberRoleControls({
  communityId,
  userId,
  role,
}: {
  communityId: string;
  userId: string;
  role: 'member' | 'moderator' | 'owner';
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    setMemberRoleAction,
    idleState,
  );

  if (role === 'owner') {
    return <span className="text-xs text-zinc-400">Owner (transfer required)</span>;
  }

  const nextRole = role === 'moderator' ? 'member' : 'moderator';
  const label = role === 'moderator' ? 'Demote' : 'Make moderator';

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="communityId" value={communityId} />
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={nextRole} />
        <button
          type="submit"
          disabled={isPending}
          className="h-8 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : label}
        </button>
      </form>
      <ActionError state={state} />
    </div>
  );
}

export function RemoveMemberButton({
  communityId,
  userId,
}: {
  communityId: string;
  userId: string;
}) {
  const [state, formAction, isPending] = useActionState<CommunityActionState, FormData>(
    removeMemberAction,
    idleState,
  );
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={isPending}
        className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Removing…' : 'Remove'}
      </button>
      <ActionError state={state} />
    </form>
  );
}
