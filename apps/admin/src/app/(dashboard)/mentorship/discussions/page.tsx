import Link from 'next/link';
import { formatDate } from '@/lib/format';
import {
  getMentorDiscussions,
  getMentorsDropdown,
  PAGE_SIZE,
} from '@/features/mentorship/queries';
import {
  createDiscussionAction,
  deleteDiscussionAction,
} from '@/features/mentorship/actions';

export default async function MentorDiscussionsPage({
  searchParams,
}: PageProps<'/mentorship/discussions'>) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const [{ rows, total }, mentors] = await Promise.all([
    getMentorDiscussions({ page }),
    getMentorsDropdown(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    return target > 1 ? `/mentorship/discussions?page=${target}` : '/mentorship/discussions';
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
            <span className="text-zinc-800">Discussions</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Community Mentor Discussions
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Publish educational articles, career insights, and announcements on behalf of mentors into the student feed.
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
          { href: '/mentorship/applications', label: 'Applications' },
          { href: '/mentorship/sessions', label: 'Sessions' },
          { href: '/mentorship/questions', label: 'Questions' },
          { href: '/mentorship/discussions', label: 'Discussions', active: true },
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

      {/* ── Create New Discussion Card ───────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Post New Discussion Article</h2>
        <p className="text-xs text-zinc-500 mb-4">
          This post will be displayed with the mentor&apos;s avatar and details in the mobile app.
        </p>

        <form action={createDiscussionAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Select Mentor Author <span className="text-red-500">*</span>
              </label>
              <select
                name="opportunity_id"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">-- Choose a mentor --</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.organization_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Post Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                placeholder="e.g. Tips for Research Publication in Top Journals"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Article Content / Discussion Body <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              rows={4}
              placeholder="Write the insights, guide, or announcement that students can read, like, and comment on..."
              required
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition"
            >
              Publish to Mobile Feed
            </button>
          </div>
        </form>
      </div>

      {/* ── Discussions List ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200">
          <h3 className="text-base font-semibold text-zinc-900">Published Discussions</h3>
          <p className="text-xs text-zinc-500">Live posts currently visible to students</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            No discussions published yet. Use the form above to post your first article!
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <div
                key={row.id}
                className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-zinc-50 transition"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-indigo-600">
                      {row.mentor_title ?? 'Mentor'}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="text-xs text-zinc-400">
                      {formatDate(row.created_at)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-zinc-900">{row.title}</h4>
                  <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {row.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 pt-1">
                    <span className="flex items-center gap-1">
                      <span>❤️</span> {row.likes_count} likes
                    </span>
                    <span className="flex items-center gap-1">
                      <span>💬</span> {row.comments_count} comments
                    </span>
                  </div>
                </div>

                <div className="sm:self-center">
                  <form action={deleteDiscussionAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition shadow-sm"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages} ({total} discussions)
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
