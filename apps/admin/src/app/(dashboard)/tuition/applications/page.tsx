import Link from 'next/link';

import { ApplicationReviewForm } from '@/features/tuition/application-review-form';
import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TutorApplicationStatus } from '@kse/types';

const PAGE_SIZE = 20;

interface ApplicationRow {
  id: string;
  user_id: string;
  headline: string;
  bio: string | null;
  location: string | null;
  expected_fee_min: number | null;
  expected_fee_max: number | null;
  availability: string | null;
  status: TutorApplicationStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  university: { name: string } | null;
  tutor_application_subjects: { subjects: { name: string } | null }[];
}

const STATUS_BADGES: Record<TutorApplicationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<TutorApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * Tutor application review (spec §7 "Tuition Management"): students apply as
 * tutors from their profile; staff approve (creates the verified listing) or
 * reject with a note here.
 */
export default async function TutorApplicationsPage({
  searchParams,
}: PageProps<'/tuition/applications'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  // Pending counter for the header, independent of the active filter.
  const { count: pendingCount } = await admin
    .from('tutor_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  let query = admin
    .from('tutor_applications')
    .select(
      'id, user_id, headline, bio, location, expected_fee_min, expected_fee_max, ' +
        'availability, status, review_note, reviewed_at, created_at, ' +
        'university:universities(name), tutor_application_subjects(subjects(name))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  const sanitized = q.replace(/[,()%]/g, ' ').trim();
  if (sanitized) {
    // Applicant names live in profiles (no FK to tutor_applications), so
    // resolve ids first — same approach as the tutors page.
    const { data: nameMatches } = await admin
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${sanitized}%`);
    const nameIds = (nameMatches ?? []).map((row) => row.id);
    query = query.or(
      `headline.ilike.%${sanitized}%,location.ilike.%${sanitized}%` +
        (nameIds.length > 0 ? `,user_id.in.(${nameIds.join(',')})` : ''),
    );
  }
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    query = query.eq('status', status);
  }

  const { data: rows, count, error } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

  const applications = (rows ?? []) as unknown as ApplicationRow[];
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', applications.map((application) => application.user_id));
  const names = new Map(
    (profileRows ?? []).map((row) => [row.id, row.full_name ?? 'Applicant']),
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/tuition/applications?${qs}` : '/tuition/applications';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Tutor Applications
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {pendingCount ?? 0} pending · {total} total ·{' '}
            <Link href="/tuition" className="text-indigo-600 hover:underline">
              Back to Tuition &amp; Tutors
            </Link>
          </p>
        </div>
      </div>

      <form
        method="get"
        action="/tuition/applications"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search applicant name, headline, location…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || status) && (
          <Link
            href="/tuition/applications"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load applications: {error.message}
          </p>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No applications match.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Applications arrive when students submit the Become a Tutor form in
              the app.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">University</th>
                <th className="px-4 py-3 font-medium">Subjects</th>
                <th className="px-4 py-3 font-medium">Fee (৳/mo)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr
                  key={application.id}
                  className="border-b border-zinc-100 align-top last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">
                      {names.get(application.user_id) ?? 'Applicant'}
                    </span>
                    <div className="text-xs text-zinc-400">{application.headline}</div>
                    {application.location && (
                      <div className="text-xs text-zinc-400">{application.location}</div>
                    )}
                    {application.availability && (
                      <div className="text-xs text-zinc-400">
                        {application.availability}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {application.university?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {application.tutor_application_subjects
                      .map((link) => link.subjects?.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {application.expected_fee_min ?? application.expected_fee_max
                      ? `${application.expected_fee_min ?? '—'}–${application.expected_fee_max ?? '—'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[application.status]}`}
                    >
                      {STATUS_LABELS[application.status]}
                    </span>
                    {application.status !== 'pending' && application.review_note && (
                      <div className="mt-1 max-w-48 text-xs text-zinc-400">
                        {application.review_note}
                      </div>
                    )}
                    {application.status !== 'pending' && application.reviewed_at && (
                      <div className="mt-1 text-xs text-zinc-400">
                        {formatDate(application.reviewed_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(application.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {application.status === 'pending' ? (
                      <ApplicationReviewForm
                        applicationId={application.id}
                        applicantName={names.get(application.user_id) ?? 'Applicant'}
                      />
                    ) : application.status === 'approved' ? (
                      <Link
                        href="/tuition"
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        View listing →
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
