'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

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

  const [audienceKind, setAudienceKind] = useState<string>('all_users');
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [peopleQuery, setPeopleQuery] = useState('');

  const visiblePeople = (() => {
    const query = peopleQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.label.toLowerCase().includes(query),
    );
  })();

  // React auto-resets every input once the action's promise settles — even
  // when the action returned a validation error, which would wipe what the
  // admin typed. Cancel it and clear just the message on success, keeping
  // the audience selection for follow-up sends.
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const opportunityIdRef = useRef<HTMLInputElement>(null);
  const lastDelivered = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.delivered === undefined || state.delivered === lastDelivered.current) {
      return;
    }
    lastDelivered.current = state.delivered;
    if (titleRef.current) titleRef.current.value = '';
    if (bodyRef.current) bodyRef.current.value = '';
    if (opportunityIdRef.current) opportunityIdRef.current.value = '';
  }, [state.delivered]);

  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="flex flex-col gap-5"
    >
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
            value="all_users"
            checked={audienceKind === 'all_users'}
            onChange={() => setAudienceKind('all_users')}
          />
          All users
          <span className="text-xs text-zinc-400">
            every active account — students, tutors and staff
          </span>
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
            Users at a university
          </span>
          {/* Using the dropdown selects its radio (and the dropdown stays
              clickable — a disabled select could never steal the focus that
              would have corrected the audience). */}
          <select
            name="universityId"
            defaultValue=""
            onFocus={() => setAudienceKind('university')}
            className={inputClass + (audienceKind === 'university' ? '' : ' opacity-60')}
          >
            <option value="">Choose a university…</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="audienceKind"
              value="users"
              checked={audienceKind === 'users'}
              onChange={() => setAudienceKind('users')}
            />
            Specific people
            <span className="text-xs text-zinc-400">one or more</span>
          </label>
          {/* Using the picker selects its radio. Checked boxes submit as
              repeated userIds entries, so one person and many share a path. */}
          <div
            onFocus={() => setAudienceKind('users')}
            className={
              'overflow-hidden rounded-lg border border-zinc-300 bg-white' +
              (audienceKind === 'users' ? '' : ' opacity-60')
            }
          >
            <input
              type="search"
              value={peopleQuery}
              onChange={(event) => setPeopleQuery(event.target.value)}
              placeholder="Search name or email…"
              className="h-9 w-full border-b border-zinc-200 px-3 text-sm text-zinc-900 outline-none"
            />
            <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto p-2">
              {visiblePeople.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-zinc-400">No matches.</p>
              )}
              {visiblePeople.map((student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    name="userIds"
                    value={student.id}
                    checked={selectedPeople.has(student.id)}
                    onChange={(event) =>
                      setSelectedPeople((previous) => {
                        const next = new Set(previous);
                        if (event.target.checked) {
                          next.add(student.id);
                        } else {
                          next.delete(student.id);
                        }
                        return next;
                      })
                    }
                    className="size-4 accent-indigo-600"
                  />
                  {student.label}
                </label>
              ))}
            </div>
            <p className="border-t border-zinc-200 px-3 py-1.5 text-xs text-zinc-500">
              {selectedPeople.size === 0
                ? 'Check the people who should receive this.'
                : `${selectedPeople.size} recipient${selectedPeople.size === 1 ? '' : 's'} selected`}
            </p>
          </div>
        </div>
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
            ref={titleRef}
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
          ref={bodyRef}
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
              ref={opportunityIdRef}
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
