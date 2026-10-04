'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { sendNotification, type NotificationActionState } from './actions';
import { KHULNA_DISTRICT_OPTIONS, NOTIFICATION_TYPE_OPTIONS } from '@kse/shared';

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const textareaClass =
  'min-h-28 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/** How many institution rows render at once — searching narrows the list,
 *  so a windowed render keeps 3.5k+ institutions snappy. */
const INSTITUTION_WINDOW = 50;

export interface InstitutionOption {
  id: string;
  name: string;
  city: string | null;
}

export interface StudentOption {
  id: string;
  label: string;
}

interface NotificationsComposeFormProps {
  institutions: InstitutionOption[];
  students: StudentOption[];
}

/** Compose a one-off notification (spec §18, step 17) — server action
 *  delivers through the service role to RLS-protected tables. Audiences:
 *  everyone, an institution (searchable across the full directory), a
 *  district, or specific people. */
export function NotificationsComposeForm({
  institutions,
  students,
}: NotificationsComposeFormProps) {
  const [state, formAction, isPending] = useActionState<
    NotificationActionState,
    FormData
  >(sendNotification, {});

  const [audienceKind, setAudienceKind] = useState<string>('all_users');
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [peopleQuery, setPeopleQuery] = useState('');
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] =
    useState<InstitutionOption | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const visiblePeople = useMemo(() => {
    const query = peopleQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.label.toLowerCase().includes(query),
    );
  }, [students, peopleQuery]);

  const visibleInstitutions = useMemo(() => {
    const query = institutionQuery.trim().toLowerCase();
    const base = query
      ? institutions.filter(
          (institution) =>
            institution.name.toLowerCase().includes(query) ||
            (institution.city ?? '').toLowerCase().includes(query),
        )
      : institutions;
    return base.slice(0, INSTITUTION_WINDOW);
  }, [institutions, institutionQuery]);

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

        {/* Institution targeting — searchable across the whole education
            institution directory (schools, colleges, universities). */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="audienceKind"
              value="institution"
              checked={audienceKind === 'institution'}
              onChange={() => setAudienceKind('institution')}
            />
            Users at an institution
            <span className="text-xs text-zinc-400">
              students with it on Portfolio → Education
            </span>
          </label>
          <input
            type="hidden"
            name="institutionId"
            value={selectedInstitution?.id ?? ''}
          />
          <div
            onFocus={() => setAudienceKind('institution')}
            className={
              'overflow-hidden rounded-lg border border-zinc-300 bg-white' +
              (audienceKind === 'institution' ? '' : ' opacity-60')
            }
          >
            <input
              type="search"
              value={institutionQuery}
              onChange={(event) => setInstitutionQuery(event.target.value)}
              placeholder="Search institutions by name or district — e.g. Engineering, College, Jashore…"
              className="h-9 w-full border-b border-zinc-200 px-3 text-sm text-zinc-900 outline-none"
            />
            {selectedInstitution && (
              <p className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-indigo-50/60 px-3 py-1.5 text-xs text-indigo-800">
                <span className="truncate">
                  Selected: {selectedInstitution.name}
                  {selectedInstitution.city ? ` — ${selectedInstitution.city}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedInstitution(null)}
                  className="shrink-0 rounded px-1.5 py-0.5 font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Clear
                </button>
              </p>
            )}
            <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto p-2">
              {visibleInstitutions.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-zinc-400">No matches.</p>
              )}
              {visibleInstitutions.map((institution) => {
                const active = selectedInstitution?.id === institution.id;
                return (
                  <button
                    key={institution.id}
                    type="button"
                    onClick={() => {
                      setAudienceKind('institution');
                      setSelectedInstitution(institution);
                    }}
                    className={
                      'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-zinc-50 ' +
                      (active ? 'bg-indigo-50 font-medium text-indigo-800' : 'text-zinc-700')
                    }
                  >
                    <span className="min-w-0 truncate">{institution.name}</span>
                    {institution.city && (
                      <span className="shrink-0 text-xs text-zinc-400">
                        {institution.city}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="border-t border-zinc-200 px-3 py-1.5 text-xs text-zinc-500">
              {institutions.length} institutions in the directory — showing{' '}
              {visibleInstitutions.length}
              {institutionQuery ? ' matches' : ''}. Recipients are users who
              listed the selected institution on their education.
            </p>
          </div>
        </div>

        {/* District targeting — profile location field. */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="audienceKind"
              value="district"
              checked={audienceKind === 'district'}
              onChange={() => setAudienceKind('district')}
            />
            Users in a district
            <span className="text-xs text-zinc-400">
              profile location (Khulna Division)
            </span>
          </label>
          <input type="hidden" name="district" value={selectedDistrict} />
          <div
            onFocus={() => setAudienceKind('district')}
            className={
              'flex flex-wrap gap-2 rounded-lg border border-zinc-300 bg-white p-2.5' +
              (audienceKind === 'district' ? '' : ' opacity-60')
            }
          >
            {KHULNA_DISTRICT_OPTIONS.map((option) => {
              const active = selectedDistrict === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setAudienceKind('district');
                    setSelectedDistrict(active ? '' : option.value);
                  }}
                  className={
                    'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                    (active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-zinc-300 bg-white text-zinc-600 hover:border-indigo-300 hover:text-indigo-700')
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

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
