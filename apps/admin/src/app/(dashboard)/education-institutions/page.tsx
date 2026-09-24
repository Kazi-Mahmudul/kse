import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmSubmit } from '@/components/confirm-submit';
import { EducationInstitutionCreateForm } from '@/features/education-institutions/create-form';
import {
  approveEducationInstitutionRequestAction,
  createEducationInstitutionAction,
  deactivateEducationInstitutionAction,
  reactivateEducationInstitutionAction,
  rejectEducationInstitutionRequestAction,
  updateEducationInstitutionAction,
} from '@/features/education-institutions/actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isStaff } from '@/lib/roles';
import { formatDateTime } from '@/lib/format';
import {
  EDUCATION_INSTITUTION_OWNERSHIP_LABELS,
  EDUCATION_INSTITUTION_TYPE_LABELS,
} from '@kse/shared';
import type {
  EducationInstitution,
  EducationInstitutionOwnership,
  EducationInstitutionRequest,
  EducationInstitutionType,
} from '@kse/types';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    ownership?: string;
    active?: string;
    edit?: string;
  }>;
}

type SearchParams = {
  q?: string;
  type?: string;
  ownership?: string;
  active?: string;
  edit?: string;
};

const TYPE_OPTIONS: { value: '' | EducationInstitutionType; label: string }[] = [
  { value: '', label: 'All types' },
  ...Object.entries(EDUCATION_INSTITUTION_TYPE_LABELS).map(([value, label]) => ({
    value: value as EducationInstitutionType,
    label,
  })),
];

const OWNERSHIP_OPTIONS = [
  { value: '', label: 'All ownerships' },
  ...Object.entries(EDUCATION_INSTITUTION_OWNERSHIP_LABELS).map(([value, label]) => ({
    value: value as EducationInstitutionOwnership,
    label,
  })),
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
];

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

export const dynamic = 'force-dynamic';

export default async function EducationInstitutionsPage({ searchParams }: PageProps) {
  // Staff gate (same shape as the dashboard layout — re-checked here so the
  // page works even if it's linked from a sub-route directly).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: roleRows } = await supabase.from('user_roles').select('role');
  if (!isStaff((roleRows ?? []).map((row) => row.role as string))) {
    redirect('/');
  }

  const params = await searchParams;
  const search = (params.q ?? '').trim();
  const typeFilter = (params.type ?? '').trim() as EducationInstitutionType | '';
  const ownershipFilter = (params.ownership ?? '').trim() as EducationInstitutionOwnership | '';
  const activeFilter = (params.active ?? '').trim();

  const admin = createAdminClient();

  // Build the base query — start with the filter predicates first so the
  // search box just narrows the result set the server already filtered.
  let query = admin
    .from('education_institutions')
    .select('id, name, name_bn, type, ownership_type, city, area, is_active, updated_at')
    .order('type')
    .order('city')
    .order('name');

  if (typeFilter) query = query.eq('type', typeFilter);
  if (ownershipFilter) query = query.eq('ownership_type', ownershipFilter);
  if (activeFilter === 'active') query = query.eq('is_active', true);
  if (activeFilter === 'inactive') query = query.eq('is_active', false);
  if (search) query = query.ilike('name', `%${search}%`);

  const [institutionsResponse, requestsResponse] = await Promise.all([
    query,
    admin
      .from('education_institution_requests')
      .select(
        'id, requested_by, name, name_bn, type, ownership_type, city, area, status, reviewed_at, created_at',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  const institutions = (institutionsResponse.data ?? []) as unknown as EducationInstitution[];
  const requests = (requestsResponse.data ?? []) as unknown as EducationInstitutionRequest[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Education institutions
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Khulna-division institution directory shown in the mobile Add-Education
        picker. Inactive rows are hidden from students but keep their existing
        education records valid.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 xl:col-span-2">
          <h2 className="text-base font-semibold text-zinc-900">Add institution</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            New rows appear immediately for students in the picker.
          </p>
          <EducationInstitutionCreateForm action={createEducationInstitutionAction} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 xl:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Institutions ({institutions.length})
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Use the filters to narrow the list. Click ✎ to edit or ✕ to deactivate.
              </p>
            </div>
          </header>

          <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Search</span>
              <input
                name="q"
                defaultValue={search}
                placeholder="Name contains…"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Type</span>
              <select name="type" defaultValue={typeFilter} className={inputClass}>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Ownership</span>
              <select
                name="ownership"
                defaultValue={ownershipFilter}
                className={inputClass}
              >
                {OWNERSHIP_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Status</span>
              <select name="active" defaultValue={activeFilter} className={inputClass}>
                {ACTIVE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Apply
              </button>
              <Link
                href="/education-institutions"
                className="h-9 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 inline-flex items-center"
              >
                Reset
              </Link>
            </div>
          </form>

          {institutions.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              No institutions match the current filters.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {institutions.map((row) => {
                const isEditing = params.edit === row.id;
                return (
                  <li key={row.id} className="py-2 text-sm text-zinc-700">
                    {isEditing ? (
                      <form action={updateEducationInstitutionAction} className="space-y-2">
                        <input type="hidden" name="id" value={row.id} />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <input
                            name="name"
                            defaultValue={row.name}
                            placeholder="Name"
                            className={inputClass}
                            required
                          />
                          <input
                            name="name_bn"
                            defaultValue={row.name_bn ?? ''}
                            placeholder="Bangla name (optional)"
                            className={inputClass}
                          />
                          <select
                            name="type"
                            defaultValue={row.type}
                            className={inputClass}
                          >
                            {Object.entries(EDUCATION_INSTITUTION_TYPE_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <select
                            name="ownership_type"
                            defaultValue={row.ownership_type}
                            className={inputClass}
                          >
                            {Object.entries(EDUCATION_INSTITUTION_OWNERSHIP_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <input
                            name="city"
                            defaultValue={row.city ?? ''}
                            placeholder="City"
                            className={inputClass}
                          />
                          <input
                            name="area"
                            defaultValue={row.area ?? ''}
                            placeholder="Area"
                            className={inputClass}
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={row.is_active}
                            className="size-4 rounded border-zinc-300"
                          />
                          Active (visible to students in the picker)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="h-8 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500"
                          >
                            Save
                          </button>
                          <Link
                            href={`/education-institutions?${keepFilters(params)}`}
                            className="h-8 rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 inline-flex items-center"
                          >
                            Cancel
                          </Link>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-medium text-zinc-900">{row.name}</span>
                            {row.name_bn ? (
                              <span className="text-xs text-zinc-500">({row.name_bn})</span>
                            ) : null}
                            {!row.is_active ? (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                                inactive
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-zinc-500">
                            {EDUCATION_INSTITUTION_TYPE_LABELS[row.type]} ·{' '}
                            {EDUCATION_INSTITUTION_OWNERSHIP_LABELS[row.ownership_type]}
                            {row.city ? ` · ${row.city}` : ''}
                            {row.area ? ` · ${row.area}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Link
                            href={`/education-institutions?${keepFilters(params)}&edit=${row.id}`}
                            className="h-7 rounded-md border border-zinc-300 px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 inline-flex items-center"
                          >
                            Edit
                          </Link>
                          {row.is_active ? (
                            <form action={deactivateEducationInstitutionAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <ConfirmSubmit
                                label="Deactivate"
                                message={`Deactivate "${row.name}"? Students won't be able to pick it for new entries, but existing education records remain valid.`}
                                className="h-7 rounded-md border border-zinc-300 px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                              />
                            </form>
                          ) : (
                            <form action={reactivateEducationInstitutionAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <ConfirmSubmit
                                label="Reactivate"
                                message={`Reactivate "${row.name}"? Students will see it in the picker again.`}
                                className="h-7 rounded-md border border-emerald-300 px-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                              />
                            </form>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 xl:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Pending institution requests ({requests.length})
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Students submitted these because their institution wasn&apos;t in
                the picker. Approving creates a public row in
                education_institutions.
              </p>
            </div>
          </header>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No pending requests.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {requests.map((req) => (
                <li key={req.id} className="space-y-1 py-3 text-sm text-zinc-700">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-zinc-900">{req.name}</span>
                    <span className="text-xs text-zinc-500">
                      {formatDateTime(req.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {EDUCATION_INSTITUTION_TYPE_LABELS[req.type]}
                    {req.ownership_type
                      ? ` · ${EDUCATION_INSTITUTION_OWNERSHIP_LABELS[req.ownership_type]}`
                      : ''}
                    {req.city ? ` · ${req.city}` : ''}
                    {req.area ? ` · ${req.area}` : ''}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <form action={approveEducationInstitutionRequestAction}>
                      <input type="hidden" name="id" value={req.id} />
                      <button
                        type="submit"
                        className="h-7 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Approve
                      </button>
                    </form>
                    <form
                      action={rejectEducationInstitutionRequestAction}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input type="hidden" name="id" value={req.id} />
                      <input
                        name="review_note"
                        placeholder="Rejection note (optional)"
                        className={inputClass}
                      />
                      <button
                        type="submit"
                        className="h-7 rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Preserve current query-string filters when navigating to/from edit mode. */
function keepFilters(params: SearchParams): string {
  const usp = new URLSearchParams();
  if (params.q) usp.set('q', params.q);
  if (params.type) usp.set('type', params.type);
  if (params.ownership) usp.set('ownership', params.ownership);
  if (params.active) usp.set('active', params.active);
  return usp.toString();
}
