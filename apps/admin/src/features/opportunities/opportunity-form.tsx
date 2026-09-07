'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import {
  saveOpportunityAction,
} from '@/features/opportunities/actions';
import {
  initialOpportunityActionState,
  type CategoryOption,
  type OpportunityFormData,
} from '@/features/opportunities/types';
import {
  DEGREE_LEVEL_OPTIONS,
  FUNDING_TYPE_OPTIONS,
  OPPORTUNITY_MODE_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
} from '@kse/shared';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/** Shared create/edit form. Uncontrolled inputs keep values when the
 *  server action returns field errors (progressive enhancement). */
export function OpportunityForm({
  categories,
  opportunity,
}: {
  categories: CategoryOption[];
  opportunity?: OpportunityFormData;
}) {
  const [state, formAction, isPending] = useActionState(
    saveOpportunityAction,
    initialOpportunityActionState,
  );

  const [type, setType] = useState<string>(opportunity?.type ?? 'internship');
  const [tags, setTags] = useState<string[]>(opportunity?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');

  const err = (field: string) =>
    state.fieldErrors[field] ? (
      <p className="mt-1 text-xs text-red-600">{state.fieldErrors[field]}</p>
    ) : null;

  const scopedCategories = categories.filter(
    (c) => c.opportunity_type === null || c.opportunity_type === type,
  );

  const addTag = () => {
    const name = tagDraft.trim().toLowerCase();
    if (!name || tags.includes(name) || tags.length >= 10) return;
    setTags([...tags, name]);
    setTagDraft('');
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {opportunity && <input type="hidden" name="id" value={opportunity.id} />}
      <input type="hidden" name="tags" value={tags.join(',')} />

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
          <span className="text-sm font-medium text-zinc-700">Type</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            {OPPORTUNITY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {err('type')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Category</span>
          <select name="category_id" defaultValue={opportunity?.category_id ?? ''} className={inputClass}>
            <option value="">— None —</option>
            {scopedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {err('category_id')}
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Title</span>
        <input
          name="title"
          defaultValue={opportunity?.title}
          placeholder="e.g. Software Engineering Intern"
          className={inputClass}
        />
        {err('title')}
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Organization</span>
          <input
            name="organization_name"
            defaultValue={opportunity?.organization_name}
            placeholder="e.g. Brain Station 23"
            className={inputClass}
          />
          {err('organization_name')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Location</span>
          <input
            name="location"
            defaultValue={opportunity?.location}
            placeholder="e.g. Dhaka (Banani)"
            className={inputClass}
          />
          {err('location')}
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Summary</span>
        <input
          name="summary"
          defaultValue={opportunity?.summary}
          placeholder="One-line summary shown on cards (max 300 characters)"
          className={inputClass}
        />
        {err('summary')}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Description</span>
        <textarea
          name="description"
          defaultValue={opportunity?.description}
          rows={8}
          placeholder="Full details, requirements, benefits…"
          className={textareaClass}
        />
        {err('description')}
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Mode</span>
          <select
            name="opportunity_mode"
            defaultValue={opportunity?.opportunity_mode ?? ''}
            className={inputClass}
          >
            <option value="">— Not specified —</option>
            {OPPORTUNITY_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {err('opportunity_mode')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">
            Deadline <span className="font-normal text-zinc-400">(UTC)</span>
          </span>
          <input
            type="datetime-local"
            name="deadline"
            defaultValue={opportunity?.deadline}
            className={inputClass}
          />
          {err('deadline')}
        </label>
      </div>

      {type === 'scholarship' && (
        <div className="grid grid-cols-1 gap-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Degree level</span>
            <select
              name="degree_level"
              defaultValue={opportunity?.degree_level ?? ''}
              className={inputClass}
            >
              <option value="">— Not specified —</option>
              {DEGREE_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {err('degree_level')}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Funding type</span>
            <select
              name="funding_type"
              defaultValue={opportunity?.funding_type ?? ''}
              className={inputClass}
            >
              <option value="">— Not specified —</option>
              {FUNDING_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {err('funding_type')}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Country</span>
            <input
              name="country"
              defaultValue={opportunity?.country}
              placeholder="e.g. Bangladesh"
              className={inputClass}
            />
            {err('country')}
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Eligibility</span>
        <textarea
          name="eligibility"
          defaultValue={opportunity?.eligibility}
          rows={3}
          placeholder="Who can apply (university, level, skills…)"
          className={textareaClass}
        />
        {err('eligibility')}
      </label>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Application URL</span>
          <input
            name="application_url"
            defaultValue={opportunity?.application_url}
            placeholder="https://…"
            className={inputClass}
          />
          {err('application_url')}
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Image</span>
          {opportunity?.image_url ? (
            <a
              href={opportunity.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 truncate text-xs text-indigo-600 hover:underline"
            >
              Current image ↗
            </a>
          ) : null}
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Image URL (alternative)</span>
          <input
            name="image_url"
            defaultValue={opportunity?.image_url}
            placeholder="https://… (ignored when a file is chosen)"
            className={inputClass}
          />
          {err('image_url')}
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Tags</span>
          <div className="flex gap-2">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addTag}
              className="h-10 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  {tag} ✕
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Source name</span>
          <input
            name="source_name"
            defaultValue={opportunity?.source_name}
            placeholder="e.g. Company careers page"
            className={inputClass}
          />
          {err('source_name')}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Source URL</span>
          <input
            name="source_url"
            defaultValue={opportunity?.source_url}
            placeholder="https://…"
            className={inputClass}
          />
          {err('source_url')}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Status</span>
          <select
            name="status"
            defaultValue={opportunity?.status ?? 'draft'}
            className={inputClass}
          >
            {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {err('status')}
        </label>

        <label className="flex items-center gap-2.5 pt-6">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={opportunity?.featured ?? false}
            className="size-4 accent-indigo-600"
          />
          <span className="text-sm font-medium text-zinc-700">Featured</span>
        </label>

        <label className="flex items-center gap-2.5 pt-6">
          <input
            type="checkbox"
            name="verified"
            defaultChecked={opportunity?.verified ?? false}
            className="size-4 accent-indigo-600"
          />
          <span className="text-sm font-medium text-zinc-700">Verified</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : opportunity ? 'Save changes' : 'Create opportunity'}
        </button>
        <Link
          href="/opportunities"
          className="h-10 rounded-lg border border-zinc-300 px-4 leading-10 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
