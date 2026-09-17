'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { saveCommunityAction, type SaveCommunityState } from './actions';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

export interface CommunityUniversityOption {
  id: string;
  name: string;
}

/** Slugify a name into the a-z0-9-dash format communities.slug requires. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const initialSaveState: SaveCommunityState = { error: null, fieldErrors: {} };

/** Admin create-community form (spec §7) — slug auto-suggested from name. */
export function CommunityForm({
  universities,
}: {
  universities: CommunityUniversityOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveCommunityAction,
    initialSaveState,
  );
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const err = (field: string) =>
    state.fieldErrors[field] ? (
      <p className="mt-1 text-xs text-red-600">{state.fieldErrors[field]}</p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            placeholder="e.g. KUET Coding Club"
            className={inputClass}
          />
          {err('name')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">
            Slug <span className="font-normal text-zinc-400">(unique, used in URLs)</span>
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="kuet-coding-club"
            className={inputClass}
          />
          {err('slug')}
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">University (optional)</span>
        <select name="university_id" defaultValue="" className={inputClass}>
          <option value="">— Open to everyone —</option>
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
        </select>
        {err('university_id')}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Description</span>
        <textarea
          name="description"
          rows={4}
          placeholder="What the community is about, who should join…"
          className={textareaClass}
        />
        {err('description')}
      </label>

      <label className="flex flex-col gap-1.5 md:max-w-60">
        <span className="text-sm font-medium text-zinc-700">Status</span>
        <select name="status" defaultValue="active" className={inputClass}>
          <option value="active">Active — visible in the app</option>
          <option value="hidden">Hidden — hidden from lists</option>
        </select>
        {err('status')}
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create community'}
        </button>
        <Link
          href="/communities"
          className="h-10 rounded-lg border border-zinc-300 px-4 leading-10 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
