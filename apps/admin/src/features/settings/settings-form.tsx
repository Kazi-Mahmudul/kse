'use client';

import { useActionState } from 'react';

import {
  saveSettingsAction,
  type SettingsActionState,
} from './actions';

// 'use server' files may only export async functions, so the initial
// state lives here in the client form instead of next to the action.
const initialSettingsState: SettingsActionState = {
  error: null,
  saved: false,
};

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

export interface SettingsFormValues {
  maintenance_mode: boolean;
  support_contact: string;
  terms_url: string;
  privacy_url: string;
  min_app_version: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  website_url: string;
  feature_flags_json: string;
}

/** Platform settings form (spec §7) — one save writes every key. */
export function SettingsForm({ values }: { values: SettingsFormValues }) {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveSettingsAction, initialSettingsState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700"
        >
          Settings saved.
        </p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Support &amp; legal</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Shown to students in app settings and footers.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Support contact</span>
            <input
              name="support_contact"
              defaultValue={values.support_contact}
              placeholder="support@kse.app"
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Minimum app version</span>
            <input
              name="min_app_version"
              defaultValue={values.min_app_version}
              placeholder="1.0.0"
              required
              className={inputClass}
            />
            <span className="text-xs text-zinc-400">
              Versions below this are asked to update (semver).
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Terms of service URL</span>
            <input
              name="terms_url"
              defaultValue={values.terms_url}
              placeholder="https://kse.app/terms"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Privacy policy URL</span>
            <input
              name="privacy_url"
              defaultValue={values.privacy_url}
              placeholder="https://kse.app/privacy"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Social links</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Optional — empty fields are dropped from the saved object.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {(
            [
              ['facebook_url', 'Facebook', 'https://facebook.com/…', values.facebook_url],
              ['instagram_url', 'Instagram', 'https://instagram.com/…', values.instagram_url],
              ['linkedin_url', 'LinkedIn', 'https://linkedin.com/…', values.linkedin_url],
              ['website_url', 'Website', 'https://kse.app', values.website_url],
            ] as const
          ).map(([name, label, placeholder, defaultValue]) => (
            <label key={name} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">{label}</span>
              <input
                name={name}
                defaultValue={defaultValue}
                placeholder={placeholder}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Runtime switches</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Feature flags is a JSON object of name → true/false.
        </p>
        <label className="mt-4 flex items-center gap-2.5">
          <input
            type="checkbox"
            name="maintenance_mode"
            defaultChecked={values.maintenance_mode}
            className="size-4 accent-indigo-600"
          />
          <span className="text-sm font-medium text-zinc-700">
            Maintenance mode
          </span>
          <span className="text-xs text-zinc-400">
            Students see a maintenance screen instead of the app.
          </span>
        </label>
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Feature flags</span>
          <textarea
            name="feature_flags"
            defaultValue={values.feature_flags_json}
            placeholder='{ "tuition": true, "mentorship": false }'
            className={textareaClass}
          />
        </label>
      </section>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
