'use client';

import { useActionState } from 'react';

import {
  EDUCATION_INSTITUTION_OWNERSHIP_LABELS,
  EDUCATION_INSTITUTION_TYPE_LABELS,
} from '@kse/shared';

import {
  initialEducationInstitutionActionState,
  type EducationInstitutionActionState,
} from './state';

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/**
 * Compact create-form for new education_institutions rows. Mirrors the
 * master-data EntityForm chrome but adds the is_active checkbox the shared
 * form doesn't render.
 */
export function EducationInstitutionCreateForm({
  action,
}: {
  action: (
    prev: EducationInstitutionActionState,
    formData: FormData,
  ) => Promise<EducationInstitutionActionState>;
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialEducationInstitutionActionState,
  );

  const err = (field: string) =>
    state.fieldErrors[field] ? (
      <p className="text-xs text-red-600">{state.fieldErrors[field]}</p>
    ) : null;

  return (
    <form action={formAction} className="mt-3">
      {state.error ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Name</span>
          <input name="name" placeholder="Khulna University" className={inputClass} required />
          {err('name')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Bangla name</span>
          <input name="name_bn" placeholder="খুলনা বিশ্ববিদ্যালয়" className={inputClass} />
          {err('name_bn')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Type</span>
          <select name="type" defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a type…
            </option>
            {Object.entries(EDUCATION_INSTITUTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {err('type')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Ownership</span>
          <select name="ownership_type" defaultValue="public" className={inputClass}>
            {Object.entries(EDUCATION_INSTITUTION_OWNERSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {err('ownership_type')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">City</span>
          <input name="city" placeholder="Khulna" className={inputClass} />
          {err('city')}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Area</span>
          <input name="area" placeholder="Gollamari, Khulna" className={inputClass} />
          {err('area')}
        </label>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked
          className="size-4 rounded border-zinc-300"
        />
        Active (visible to students in the picker)
      </label>

      <div className="mt-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add institution'}
        </button>
      </div>
    </form>
  );
}
