import Link from 'next/link';
import { Suspense } from 'react';

import { formatDate } from '@/lib/format';
import { getMentors, getMentorshipKpis, PAGE_SIZE } from '@/features/mentorship/queries';
import { setMentorStatusAction } from '@/features/mentorship/actions';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
] as const;

const STATUS_TONES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  pending_review: 'bg-amber-50 text-amber-700',
  draft: 'bg-zinc-100 text-zinc-600',
  archived: 'bg-zinc-200 text-zinc-500',
  rejected: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  pending_review: 'Pending Review',
  draft: 'Draft',
  archived: 'Archived',
  rejected: 'Rejected',
};

function ModeTag({ mode }: { mode: string | null }) {
  if (!mode) return null;
  const styles: Record<string, string> = {
    online: 'bg-blue-50 text-blue-700',
    onsite: 'bg-violet-50 text-violet-700',
    hybrid: 'bg-teal-50 text-teal-700',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[mode] ?? 'bg-zinc-100 text-zinc-600'}`}
    >
      {mode}
    </span>
  );
}

/**
 * /mentorship — Mentor management hub.
 *
 * - KPI tiles at the top (total, published, pending sessions, open Q&A)
 * - Sub-navigation tabs to sessions / questions / discussions
 * - Full mentor table with search + status filter + quick-publish actions
 */
export default async function MentorshipPage({
  searchParams,
}: PageProps<'/mentorship'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const [kpis, { rows, total }] = await Promise.all([
    getMentorshipKpis(),
    getMentors({ q, status, page }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/mentorship?${qs}` : '/mentorship';
  };

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Mentorship</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage mentor profiles, sessions, student questions, and community discussions.
          </p>
        </div>
        <Link
          href="/mentorship/new"
          className="h-10 rounded-lg bg-indigo-600 px-4 leading-10 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Add mentor
        </Link>
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: 'Total mentors', value: kpis.totalMentors, href: '/mentorship', tone: '' },
          { label: 'Published', value: kpis.publishedMentors, href: '/mentorship?status=published', tone: 'text-emerald-700' },
          { label: 'Pending sessions', value: kpis.pendingSessionRequests, href: '/mentorship/sessions?status=pending', tone: kpis.pendingSessionRequests > 0 ? 'text-amber-600' : '' },
          { label: 'Confirmed sessions', value: kpis.confirmedSessions, href: '/mentorship/sessions?status=confirmed', tone: '' },
          { label: 'Open questions', value: kpis.openQuestions, href: '/mentorship/questions?status=pending', tone: kpis.openQuestions > 0 ? 'text-amber-600' : '' },
          { label: 'Answered Q&As', value: kpis.answeredQuestions, href: '/mentorship/questions?status=answered', tone: 'text-emerald-700' },
          { label: 'Discussions', value: kpis.totalDiscussions, href: '/mentorship/discussions', tone: '' },
        ].map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <p className="text-xs font-medium text-zinc-500">{tile.label}</p>
            <p className={`mt-1.5 text-2xl font-bold tabular-nums ${tile.tone || 'text-zinc-900'}`}>
              {tile.value}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Sub-navigation ────────────────────────────────────────────────── */}
      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {[
          { href: '/mentorship', label: 'Mentors' },
          { href: '/mentorship/sessions', label: `Sessions ${kpis.pendingSessionRequests > 0 ? `(${kpis.pendingSessionRequests} pending)` : ''}` },
          { href: '/mentorship/questions', label: `Questions ${kpis.openQuestions > 0 ? `(${kpis.openQuestions} open)` : ''}` },
          { href: '/mentorship/discussions', label: 'Discussions' },
        ].map((tab) => {
          const isActive = tab.href === '/mentorship';
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px',
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* ── Search + filters ──────────────────────────────────────────────── */}
      <form
        method="get"
        action="/mentorship"
        className="mt-5 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, organization…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || status) && (
          <Link
            href="/mentorship"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      {/* ── Mentor table ──────────────────────────────────────────────────── */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No mentors match.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Add one via &ldquo;Add mentor&rdquo; or relax the filters.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Mentor / Organization</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Exp.</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Quick actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/mentorship/${row.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.title}
                    </Link>
                    {(row.featured || row.verified) && (
                      <span className="ml-1.5 text-xs text-zinc-400">
                        {row.verified ? '✓ ' : ''}{row.featured ? '★' : ''}
                      </span>
                    )}
                    <div className="text-xs text-zinc-400">{row.organization_name}</div>
                    {row.education && (
                      <div className="mt-0.5 text-[11px] text-zinc-400 truncate max-w-[200px]">
                        {row.education}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[row.status] ?? 'bg-zinc-100 text-zinc-600'}`}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ModeTag mode={row.opportunity_mode} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-700">
                    {row.rating_avg ? (
                      <span className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        {Number(row.rating_avg).toFixed(1)}
                        <span className="text-zinc-400 text-[11px]">({row.rating_count ?? 0})</span>
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {row.experience_years != null ? `${row.experience_years} yrs` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(row.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.status !== 'published' && (
                        <form action={setMentorStatusAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="status" value="published" />
                          <button
                            type="submit"
                            className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Publish
                          </button>
                        </form>
                      )}
                      {row.status === 'published' && (
                        <form action={setMentorStatusAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                          >
                            Unpublish
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/mentorship/${row.id}`}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} of {totalPages} ({total} mentors)
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
