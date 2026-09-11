import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { VerifyButton } from '@/features/tuition/verify-button';
import type { ContentStatus } from '@kse/types';

const PAGE_SIZE = 20;

interface TutorRow {
  id: string;
  headline: string;
  location: string | null;
  expected_fee_min: number | null;
  expected_fee_max: number | null;
  is_verified: boolean;
  status: ContentStatus;
  updated_at: string;
  university: { name: string } | null;
  tutor_subjects: { subjects: { name: string } | null }[];
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  active: 'Active',
  hidden: 'Hidden',
  removed: 'Removed',
};

/** Tutor management (spec §7): search, verification state + quick verify. */
export default async function TuitionPage({
  searchParams,
}: PageProps<'/tuition'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const verified = typeof params.verified === 'string' ? params.verified : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  // Pending become-a-tutor applications feed the review queue.
  const { count: pendingApplications } = await admin
    .from('tutor_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  // tutors↔profiles share no FK, so name search resolves ids first and the
  // display names are merged in a second profiles query.
  let query = admin
    .from('tutors')
    .select(
      'id, headline, location, expected_fee_min, expected_fee_max, is_verified, ' +
        'status, updated_at, university:universities(name), tutor_subjects(subjects(name))',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false });

  const sanitized = q.replace(/[,()%]/g, ' ').trim();
  if (sanitized) {
    const { data: nameMatches } = await admin
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${sanitized}%`);
    const nameIds = (nameMatches ?? []).map((row) => row.id);
    query = query.or(
      `headline.ilike.%${sanitized}%,location.ilike.%${sanitized}%` +
        (nameIds.length > 0
          ? `,id.in.(${nameIds.map((id) => `"${id}"`).join(',')})`
          : ''),
    );
  }
  if (verified === 'true' || verified === 'false') {
    query = query.eq('is_verified', verified === 'true');
  }

  const { data: rows, count, error } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

  const tutors = (rows ?? []) as unknown as TutorRow[];
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, full_name')
    .in(
      'id',
      tutors.map((tutor) => tutor.id),
    );
  const names = new Map(
    (profileRows ?? []).map((row) => [row.id, row.full_name ?? 'Tutor']),
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (verified) sp.set('verified', verified);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/tuition?${qs}` : '/tuition';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Tuition &amp; Tutors
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} tutor {total === 1 ? 'profile' : 'profiles'} ·{' '}
            <Link
              href="/tuition/applications"
              className="text-indigo-600 hover:underline"
            >
              {pendingApplications ?? 0} pending{' '}
              {pendingApplications === 1 ? 'application' : 'applications'}
            </Link>{' '}
            ·{' '}
            <Link href="/tuition/requests" className="text-indigo-600 hover:underline">
              View tuition requests
            </Link>
          </p>
        </div>
      </div>

      <form
        method="get"
        action="/tuition"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search tutor name, headline, location…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="verified"
          defaultValue={verified}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by verification"
        >
          <option value="">All tutors</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || verified) && (
          <Link
            href="/tuition"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load tutors: {error.message}
          </p>
        ) : tutors.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No tutors match.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Tutors appear here once they create a profile from the app.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Tutor</th>
                <th className="px-4 py-3 font-medium">University</th>
                <th className="px-4 py-3 font-medium">Subjects</th>
                <th className="px-4 py-3 font-medium">Fee (৳/mo)</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {tutors.map((tutor) => (
                <tr
                  key={tutor.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">
                      {names.get(tutor.id) ?? 'Tutor'}
                    </span>
                    <div className="text-xs text-zinc-400">{tutor.headline}</div>
                    {tutor.location && (
                      <div className="text-xs text-zinc-400">{tutor.location}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {tutor.university?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {tutor.tutor_subjects
                      .map((link) => link.subjects?.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {tutor.expected_fee_min ?? tutor.expected_fee_max
                      ? `${tutor.expected_fee_min ?? '—'}–${tutor.expected_fee_max ?? '—'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {tutor.is_verified ? (
                      <span className="inline-block whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-block whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Unverified
                      </span>
                    )}
                    <div className="mt-1 text-xs text-zinc-400">
                      {STATUS_LABELS[tutor.status]}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(tutor.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <VerifyButton
                      tutorId={tutor.id}
                      tutorName={names.get(tutor.id) ?? 'Tutor'}
                      verified={tutor.is_verified}
                    />
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
