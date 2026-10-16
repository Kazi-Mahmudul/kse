import Link from 'next/link';

import { reviewMentorApplicationAction } from '@/features/mentorship/actions';
import {
  getMentorApplications,
  type AdminMentorApplicationRow,
} from '@/features/mentorship/queries';
import { formatDate } from '@/lib/format';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_TONES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_TONES[status] ?? 'bg-zinc-100 text-zinc-600'}`}
    >
      {status}
    </span>
  );
}

function ApplicationCard({ app }: { app: AdminMentorApplicationRow }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600">
            {app.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900">{app.full_name}</h3>
              <StatusBadge status={app.status} />
            </div>
            <p className="text-sm text-zinc-500">
              {app.designation} · {app.organization}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {app.email}
              {app.phone ? ` · ${app.phone}` : ''}
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-400 shrink-0">
          Applied {formatDate(app.created_at)}
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-zinc-400">Experience</p>
          <p className="text-sm font-medium text-zinc-700">{app.experience_years}y</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Education</p>
          <p className="text-sm font-medium text-zinc-700 truncate">{app.education}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Session Mode</p>
          <p className="text-sm font-medium text-zinc-700 capitalize">{app.session_mode}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">LinkedIn</p>
          {app.linkedin_url ? (
            <a
              href={app.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline truncate block"
            >
              View Profile
            </a>
          ) : (
            <p className="text-sm text-zinc-400">—</p>
          )}
        </div>
      </div>

      {/* Expertise */}
      {app.expertise_areas?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-zinc-400 mb-1.5">Expertise Areas</p>
          <div className="flex flex-wrap gap-1.5">
            {app.expertise_areas.map((area) => (
              <span
                key={area}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      <div className="mt-3">
        <p className="text-xs text-zinc-400 mb-1">Bio</p>
        <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3">{app.bio}</p>
      </div>

      {/* Admin note (if exists) */}
      {app.admin_note && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Admin Note</p>
          <p className="text-sm text-amber-600">{app.admin_note}</p>
        </div>
      )}

      {/* Actions — only show for pending */}
      {app.status === 'pending' && (
        <div className="mt-4 flex items-start gap-3">
          <form action={reviewMentorApplicationAction} className="flex-1">
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="decision" value="approved" />
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              ✓ Approve
            </button>
          </form>

          <form action={reviewMentorApplicationAction} className="flex-1">
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="decision" value="rejected" />
            <div className="flex gap-2">
              <input
                type="text"
                name="admin_note"
                placeholder="Rejection reason (optional)..."
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                type="submit"
                className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 active:scale-[0.98] transition-all shrink-0"
              >
                ✕ Reject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Approved: link to opportunity */}
      {app.status === 'approved' && app.opportunity_id && (
        <div className="mt-4">
          <Link
            href={`/mentorship/${app.opportunity_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            View Mentor Profile →
          </Link>
        </div>
      )}
    </div>
  );
}

export default async function MentorApplicationsPage({
  searchParams,
}: PageProps<'/mentorship/applications'>) {
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : 'pending';
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;

  const { rows, total } = await getMentorApplications({ status, page });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
          <Link href="/mentorship" className="hover:text-zinc-800">
            Mentorship
          </Link>
          <span>/</span>
          <span>Applications</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Mentor Applications</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {total} application{total !== 1 ? 's' : ''} · Review and approve aspiring mentors
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        {[
          { href: '/mentorship', label: 'Mentors' },
          { href: '/mentorship/applications', label: 'Applications', active: true },
          { href: '/mentorship/sessions', label: 'Sessions' },
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

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-zinc-100 p-1 w-fit">
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const isActive = status === opt.value || (opt.value === 'all' && !status);
          return (
            <Link
              key={opt.value}
              href={`/mentorship/applications?status=${opt.value}`}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {/* Application cards */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-zinc-600 font-medium">No applications found</p>
          <p className="text-sm text-zinc-400 mt-1">
            {status === 'pending'
              ? 'No pending applications at this time.'
              : `No ${status} applications.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="mt-8 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/mentorship/applications?status=${status}&page=${page - 1}`}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50"
              >
                ← Previous
              </Link>
            )}
            {page * 25 < total && (
              <Link
                href={`/mentorship/applications?status=${status}&page=${page + 1}`}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
