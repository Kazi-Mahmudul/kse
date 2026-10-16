import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { getSessionRequests, PAGE_SIZE } from '@/features/mentorship/queries';
import { updateSessionStatusAction } from '@/features/mentorship/actions';

const STATUS_FILTERS = [
  { value: '', label: 'All Sessions' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_TONES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border border-blue-200',
  cancelled: 'bg-zinc-100 text-zinc-500 border border-zinc-200',
};

export default async function MentorshipSessionsPage({
  searchParams,
}: PageProps<'/mentorship/sessions'>) {
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const { rows, total } = await getSessionRequests({ status, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/mentorship/sessions?${qs}` : '/mentorship/sessions';
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Link href="/mentorship" className="hover:text-zinc-900 transition">
              Mentorship
            </Link>
            <span>/</span>
            <span className="text-zinc-800">Sessions</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Mentorship Sessions
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review student booking requests, manage confirmed appointments, and monitor session outcomes.
          </p>
        </div>
        <Link
          href="/mentorship"
          className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
        >
          ← Back to Mentors
        </Link>
      </div>

      {/* ── Sub Navigation Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-zinc-200">
        {[
          { href: '/mentorship', label: 'Mentors' },
          { href: '/mentorship/sessions', label: 'Sessions', active: true },
          { href: '/mentorship/questions', label: 'Questions' },
          { href: '/mentorship/discussions', label: 'Discussions' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab.active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const isSelected = status === f.value;
          const href = f.value ? `/mentorship/sessions?status=${f.value}` : '/mentorship/sessions';
          return (
            <Link
              key={f.value}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* ── Sessions Table ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-zinc-700">No session requests found</p>
            <p className="mt-1 text-xs text-zinc-400">
              There are no session bookings matching your current filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Mentor</th>
                  <th className="px-4 py-3 font-medium">Student Contact</th>
                  <th className="px-4 py-3 font-medium">Topic & Message</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/mentorship/${row.opportunity_id}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {row.mentor_title ?? 'Mentor'}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-zinc-900">{row.student_full_name ?? 'Student'}</p>
                      <p className="text-zinc-500 text-[11px]">{row.contact_email ?? row.student_email ?? '—'}</p>
                      {row.contact_phone && (
                        <p className="text-zinc-400 text-[11px]">{row.contact_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <p className="font-semibold text-zinc-800">{row.topic}</p>
                      {row.message && (
                        <p className="text-zinc-500 text-[11px] mt-0.5 line-clamp-2">{row.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-zinc-700">
                      <p className="font-medium">
                        {row.preferred_date ? formatDate(row.preferred_date) : 'Flexible date'}
                      </p>
                      {row.preferred_time && (
                        <p className="text-zinc-400 text-[11px]">{row.preferred_time}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap capitalize text-zinc-600 font-medium">
                      {row.session_mode ?? 'online'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          STATUS_TONES[row.status] ?? 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {row.status === 'pending' && (
                          <>
                            <form action={updateSessionStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="confirmed" />
                              <button
                                type="submit"
                                className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition"
                              >
                                Confirm
                              </button>
                            </form>
                            <form action={updateSessionStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="cancelled" />
                              <button
                                type="submit"
                                className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 transition"
                              >
                                Cancel
                              </button>
                            </form>
                          </>
                        )}
                        {row.status === 'confirmed' && (
                          <>
                            <form action={updateSessionStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="completed" />
                              <button
                                type="submit"
                                className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 transition"
                              >
                                Mark Completed
                              </button>
                            </form>
                            <form action={updateSessionStatusAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="cancelled" />
                              <button
                                type="submit"
                                className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 transition"
                              >
                                Cancel
                              </button>
                            </form>
                          </>
                        )}
                        {(row.status === 'completed' || row.status === 'cancelled') && (
                          <span className="text-zinc-400 text-[11px] italic">Archived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages} ({total} sessions)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-100"
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
