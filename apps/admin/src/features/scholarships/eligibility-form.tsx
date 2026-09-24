import { DEGREE_LEVEL_OPTIONS } from '@kse/shared';
import type { OpportunityEligibility } from '@kse/types';

/**
 * Read-only + editable display of an opportunity_eligibility row. Renders
 * inside the opportunity edit page; the server action handles persistence.
 *
 * Why a server component (no 'use client'): the page is already a server
 * component, all fields are uncontrolled inputs, and Next 15 inline-form
 * actions handle submission. One less hydration boundary.
 */

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

interface EligibilityFormPanelProps {
  opportunityId: string;
  eligibility: OpportunityEligibility | null;
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function EligibilityFormPanel({
  opportunityId,
  eligibility,
  saveAction,
  deleteAction,
}: EligibilityFormPanelProps) {
  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Scholarship eligibility
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Structured rules used by the mobile matching engine. Leave fields
            empty for “no constraint”. CSV arrays go in comma-separated form
            (e.g. <span className="font-mono">UK, USA, Canada</span>).
          </p>
        </div>
        {eligibility ? (
          <form action={deleteAction}>
            <input type="hidden" name="opportunity_id" value={opportunityId} />
            <button
              type="submit"
              className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-600 transition hover:bg-red-50 hover:text-red-600"
            >
              Reset
            </button>
          </form>
        ) : null}
      </header>

      <form action={saveAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input type="hidden" name="opportunity_id" value={opportunityId} />

        <fieldset className="space-y-3 sm:col-span-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Academic
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              name="min_cgpa"
              label="Minimum CGPA"
              defaultValue={eligibility?.min_cgpa ?? null}
              step="0.01"
            />
            <NumberField
              name="cgpa_scale"
              label="CGPA scale"
              defaultValue={eligibility?.cgpa_scale ?? null}
              step="0.01"
            />
            <MultiField
              name="degree_levels"
              label="Eligible degree levels"
              defaultValue={eligibility?.degree_levels ?? []}
              options={DEGREE_LEVEL_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <TextField
              name="fields"
              label="Eligible fields (comma-separated)"
              defaultValue={(eligibility?.fields ?? []).join(', ')}
              placeholder="Computer Science, Engineering"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Geography
          </legend>
          <TextField
            name="countries"
            label="Eligible countries (comma-separated)"
            defaultValue={(eligibility?.countries ?? []).join(', ')}
            placeholder="Bangladesh, India, Nepal"
          />
          <TextField
            name="nationalities"
            label="Eligible nationalities (comma-separated)"
            defaultValue={(eligibility?.nationalities ?? []).join(', ')}
            placeholder="BD, IN"
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Tests
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              name="ielts_min"
              label="IELTS min"
              defaultValue={eligibility?.ielts_min ?? null}
              step="0.5"
            />
            <NumberField
              name="toefl_min"
              label="TOEFL min"
              defaultValue={eligibility?.toefl_min ?? null}
              step="1"
            />
            <NumberField
              name="pte_min"
              label="PTE min"
              defaultValue={eligibility?.pte_min ?? null}
              step="1"
            />
            <NumberField
              name="gre_min"
              label="GRE min"
              defaultValue={eligibility?.gre_min ?? null}
              step="1"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 sm:col-span-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Required signals
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CheckboxField
              name="requires_research"
              label="Research experience"
              defaultChecked={eligibility?.requires_research ?? false}
            />
            <CheckboxField
              name="requires_publication"
              label="Publication"
              defaultChecked={eligibility?.requires_publication ?? false}
            />
            <CheckboxField
              name="requires_work_experience"
              label="Work experience"
              defaultChecked={eligibility?.requires_work_experience ?? false}
            />
            <CheckboxField
              name="requires_project_experience"
              label="Project experience"
              defaultChecked={eligibility?.requires_project_experience ?? false}
            />
            <CheckboxField
              name="requires_leadership"
              label="Leadership"
              defaultChecked={eligibility?.requires_leadership ?? false}
            />
            <CheckboxField
              name="requires_extracurricular"
              label="Extracurricular"
              defaultChecked={eligibility?.requires_extracurricular ?? false}
            />
            <CheckboxField
              name="requires_test_score"
              label="Any test score"
              defaultChecked={eligibility?.requires_test_score ?? false}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 sm:col-span-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Documents & notes
          </legend>
          <TextField
            name="required_documents"
            label="Required documents (comma-separated)"
            defaultValue={(eligibility?.required_documents ?? []).join(', ')}
            placeholder="Motivation letter, Recommendation letter"
          />
          <TextArea
            name="other_requirements"
            label="Other requirements"
            defaultValue={eligibility?.other_requirements ?? ''}
            placeholder="Free-form notes the matching engine should surface."
          />
        </fieldset>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Save eligibility
          </button>
        </div>
      </form>
    </section>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue == null ? '' : defaultValue}
        step={step ?? '1'}
        className={inputClass}
      />
    </label>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className={`${inputClass} h-auto py-2`}
      />
    </label>
  );
}

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-zinc-300"
      />
      {label}
    </label>
  );
}

function MultiField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: readonly string[];
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs font-medium text-zinc-600">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = defaultValue.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                defaultChecked={selected}
                className="size-3.5 rounded border-zinc-300"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
