'use client';

import { useActionState } from 'react';

import { initialMasterDataActionState, type MasterDataActionState } from './types';

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

export interface EntityFormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Span both grid columns (textareas-like width). */
  wide?: boolean;
}

/**
 * Compact add-form shared by every master-data entity. Uncontrolled inputs
 * keep their values when the action returns field errors, and the form
 * clears on success via <form> reset behavior.
 */
export function EntityForm({
  action,
  fields,
  submitLabel,
}: {
  action: (
    prev: MasterDataActionState,
    formData: FormData,
  ) => Promise<MasterDataActionState>;
  fields: EntityFormField[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialMasterDataActionState,
  );

  const err = (field: string) =>
    state.fieldErrors[field] ? (
      <p className="text-xs text-red-600">{state.fieldErrors[field]}</p>
    ) : null;

  return (
    <form action={formAction} className="mt-3">
      {state.error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field.name}
            className={`flex flex-col gap-1 ${field.wide ? 'sm:col-span-2' : ''}`}
          >
            <span className="text-xs font-medium text-zinc-600">{field.label}</span>
            {field.type === 'select' ? (
              <select name={field.name} defaultValue="" className={inputClass}>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? 'text'}
                name={field.name}
                placeholder={field.placeholder}
                className={inputClass}
              />
            )}
            {err(field.name)}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-3 h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Adding…' : submitLabel}
      </button>
    </form>
  );
}
