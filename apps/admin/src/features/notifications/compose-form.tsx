'use client';

import { useActionState, useState } from 'react';

import { sendNotification, type NotificationActionState } from './actions';
import { NOTIFICATION_TYPE_OPTIONS } from '@kse/shared';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-28 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

export interface UniversityOption {
  id: string;
  name: string;
}

export interface StudentOption {
  id: string;
  label: string;
}

interface NotificationsComposeFormProps {
  universities: UniversityOption[];
  students: StudentOption[];
}

/** Compose a one-off notification (spec §18, step 17) — server action
 *  delivers through the service role to RLS-protected tables. */
export function NotificationsComposeForm({
  universities,
  students,
}: NotificationsComposeFormProps) {
  const [state, formAction, isPending] = useActionState<
    NotificationActionState,
    FormData
  >(sendNotification, {});

  const [audienceKind, setAudienceKind] = useState<string>('all_students');

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
      {state.delivered !== undefined && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700"
        >
          Delivered to {state.delivered} recipient
          {state.delivered === 1 ? '' : 's'}.
        </p>
      )}

      <fieldset className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Audience
        </legend>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="radio"
            name="audienceKind"
            value="all_students"
            checked={audienceKind === 'all_students'}
            onChange={() => setAudienceKind('all_students')}
          />
          All students
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="audienceKind"
              value="university"
              checked={audienceKind === 'university'}
              onChange={() => setAudienceKind('university')}
            />
            Students at a university
          </span>
          <select
            name="universityId"
            defaultValue=""
            disabled={audienceKind !== 'university'}
            className={inputClass + ' disabled:opacity-60'}
          >
            <option value="">Choose a university…</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="audienceKind"
              value="user"
              checked={audienceKind === 'user'}
              onChange={() => setAudienceKind('user')}
            />
            A specific user
          </span>
          <select
            name="userId"
            defaultValue=""
            disabled={audienceKind !== 'user'}
            className={inputClass + ' disabled:opacity-60'}
          >
            <option value="">Choose a recipient…</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Type</span>
          <select name="type" defaultValue="custom" className={inputClass}>
            {NOTIFICATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Title</span>
          <input
            name="title"
            defaultValue=""
            maxLength={120}
            required
            placeholder="e.g. New deadline approaching"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Body</span>
        <textarea
          name="body"
          defaultValue=""
          maxLength={500}
          required
          placeholder="Two or three sentences — keep it short."
          className={textareaClass}
        />
      </label>

      <details className="rounded-xl border border-zinc-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          Optional: deep-link to an opportunity
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-500">
              Opportunity id (UUID)
            </span>
            <input
              name="opportunityId"
              defaultValue=""
              placeholder="11111111-1111-1111-1111-111111111111"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-500">
              Opportunity type
            </span>
            <select name="opportunityType" defaultValue="" className={inputClass}>
              <option value="">(none)</option>
              <option value="internship">Internship</option>
              <option value="scholarship">Scholarship</option>
              <option value="event">Event</option>
              <option value="workshop">Workshop</option>
              <option value="mentorship">Mentorship</option>
            </select>
          </label>
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send notification'}
        </button>
        <p className="text-xs text-zinc-500">
          Each recipient gets one row in their inbox; push delivery requires
          Expo push tokens and runs through a scheduled job.
        </p>
      </div>
    </form>
  );
}
