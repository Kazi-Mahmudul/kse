'use client';

import { useActionState } from 'react';

import {
  deleteCommunityCategoryAction,
  saveCommunityCategoryAction,
  type CategoryActionState,
} from './actions';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/** Inline create form for community categories (master-data style). */
export function CategoryForm() {
  const [state, formAction, isPending] = useActionState<CategoryActionState, FormData>(
    saveCommunityCategoryAction,
    {},
  );
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Name</span>
        <input name="name" placeholder="e.g. Research" className={inputClass} required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">
          Slug <span className="font-normal text-zinc-400">(optional)</span>
        </span>
        <input name="slug" placeholder="research" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Sort order</span>
        <input
          name="sort_order"
          type="number"
          min={0}
          defaultValue={0}
          className={inputClass}
        />
      </label>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Add category'}
      </button>
    </form>
  );
}

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const [state, formAction, isPending] = useActionState<CategoryActionState, FormData>(
    deleteCommunityCategoryAction,
    {},
  );
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="categoryId" value={categoryId} />
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
