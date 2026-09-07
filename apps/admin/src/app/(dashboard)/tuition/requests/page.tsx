import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TuitionRequestStatus } from '@kse/types';

const PAGE_SIZE = 20;

interface RequestRow {
  id: string;
  student_id: string;
  message: string;
  preferred_time: string | null;
  status: TuitionRequestStatus;
  created_at: string;
  subject: { name: string } | null;
  tutor: { headline: string } | null;
}

const STATUS_TONES: Record<TuitionRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  closed: 'bg-zinc-100 text-zinc-600',
};

/** Tuition requests (spec §7): read-only overview of the contact workflow. */
export default async function TuitionRequestsPage({
  searchParams,
}: PageProps<'/tuition/requests'>) {
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  let query = admin
    .from('tuition_requests')
    .select(
      'id, student_id, message, preferred_time, status, created_at, ' +
        'subject:subjects(name), tutor:tutors(headline)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: rows, count, error } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

  const requests = (rows ?? []) as unknown as RequestRow[];
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, full_name')
    .in(
      'id',
      requests.map((request) => request.student_id),
    );
  const names = new Map(
    (profileRows ?? []).map((row) => [row.id, row.full_name ?? 'Student']),
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/tuition/requests?${qs}` : '/tuition/requests';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Tuition requests
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} {total === 1 ? 'request' : 'requests'} ·{' '}
            <Link href="/tuition" className="text-indigo-600 hover:underline">
              Back to tutors
            </Link>
          </p>
        </div>
      </div>

      <form
        method="get"
        action="/tuition/requests"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {(['pending', 'accepted', 'rejected', 'closed'] as const).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {status && (
          <Link
            href="/tuition/requests"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load requests: {error.message}
          </p>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No tuition requests yet.</p>
            <p className="mt-1 text-xs text-zinc-400">
              They appear when students contact a tutor from the app.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Preferred time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {names.get(request.student_id) ?? 'Student'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {request.tutor?.headline ?? `Open · ${request.subject?.name ?? '—'}`}
                  </td>
                  <td className="max-w-80 px-4 py-3 text-zinc-600">
                    <span className="line-clamp-2">{request.message}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {request.preferred_time ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[request.status]}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(request.created_at)}
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
