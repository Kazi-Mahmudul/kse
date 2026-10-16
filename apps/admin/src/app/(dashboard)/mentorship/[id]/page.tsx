import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatDate, formatDateTime } from '@/lib/format';
import { getMentorDetail } from '@/features/mentorship/queries';
import {
  saveMentorProfileAction,
  setMentorStatusAction,
  updateSessionStatusAction,
  deleteDiscussionAction,
} from '@/features/mentorship/actions';

const STATUS_TONES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  archived: 'bg-zinc-200 text-zinc-500 border-zinc-300',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const SESSION_STATUS_TONES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
};

export default async function MentorDetailPage({
  params,
}: PageProps<'/mentorship/[id]'>) {
  const { id } = await params;
  const mentor = await getMentorDetail(id);

  if (!mentor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Link href="/mentorship" className="hover:text-zinc-900 transition">
              Mentorship
            </Link>
            <span>/</span>
            <span className="text-zinc-800">{mentor.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{mentor.title}</h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_TONES[mentor.status] ?? 'bg-zinc-100 text-zinc-600'}`}
            >
              {mentor.status.replace('_', ' ')}
            </span>
            {mentor.verified && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Verified ✓
              </span>
            )}
            {mentor.featured && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Featured ★
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {mentor.organization_name} · Last updated {formatDate(mentor.updated_at)}
          </p>
        </div>

        {/* Quick status actions */}
        <div className="flex items-center gap-2">
          {mentor.status !== 'published' ? (
            <form action={setMentorStatusAction}>
              <input type="hidden" name="id" value={mentor.id} />
              <input type="hidden" name="status" value="published" />
              <button
                type="submit"
                className="h-9 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition"
              >
                Publish mentor
              </button>
            </form>
          ) : (
            <form action={setMentorStatusAction}>
              <input type="hidden" name="id" value={mentor.id} />
              <input type="hidden" name="status" value="draft" />
              <button
                type="submit"
                className="h-9 rounded-lg border border-zinc-300 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
              >
                Move to draft
              </button>
            </form>
          )}

          {mentor.status !== 'archived' && (
            <form action={setMentorStatusAction}>
              <input type="hidden" name="id" value={mentor.id} />
              <input type="hidden" name="status" value="archived" />
              <button
                type="submit"
                className="h-9 rounded-lg border border-zinc-300 bg-white px-3.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 transition"
              >
                Archive
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left Column: Edit Form ──────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <form
            action={saveMentorProfileAction}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5"
          >
            <input type="hidden" name="id" value={mentor.id} />

            <div className="border-b border-zinc-100 pb-3">
              <h2 className="text-base font-semibold text-zinc-900">Mentor Profile Details</h2>
              <p className="text-xs text-zinc-500">
                Update public profile information shown to students in the mobile app.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Full Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={mentor.title}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Current Organization / Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="organization_name"
                  defaultValue={mentor.organization_name}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Education Background
                </label>
                <input
                  type="text"
                  name="education"
                  defaultValue={mentor.education ?? ''}
                  placeholder="e.g. BSc in CSE · KUET"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  name="experience_years"
                  defaultValue={mentor.experience_years ?? 3}
                  min="0"
                  max="60"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Average Rating (1.00 - 5.00)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="5.0"
                  name="rating_avg"
                  defaultValue={mentor.rating_avg ?? 4.8}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Rating Count
                </label>
                <input
                  type="number"
                  name="rating_count"
                  defaultValue={mentor.rating_count ?? 10}
                  min="0"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Session Mode
                </label>
                <select
                  name="opportunity_mode"
                  defaultValue={mentor.opportunity_mode === 'online' ? 'remote' : (mentor.opportunity_mode ?? 'remote')}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                >
                  <option value="remote">Online / Remote</option>
                  <option value="onsite">On-site</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Location (City / Region)
                </label>
                <input
                  type="text"
                  name="location"
                  defaultValue={mentor.location ?? 'Khulna / Remote'}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Profile Photo URL
                </label>
                <div className="flex items-center gap-2">
                  {mentor.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mentor.image_url}
                      alt={mentor.title}
                      className="h-9 w-9 rounded-full object-cover border border-zinc-200"
                    />
                  )}
                  <input
                    type="url"
                    name="image_url"
                    defaultValue={mentor.image_url ?? ''}
                    placeholder="https://... image URL"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Specialty Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={mentor.tags?.join(', ') ?? ''}
                  placeholder="e.g. career, interview-prep, system-design"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Profile / LinkedIn / Portfolio URL
                </label>
                <input
                  type="url"
                  name="source_url"
                  defaultValue={mentor.source_url ?? ''}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Summary / Tagline
                </label>
                <input
                  type="text"
                  name="summary"
                  defaultValue={mentor.summary ?? ''}
                  placeholder="Short one-line bio or mentoring motto"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Full Bio / About
                </label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={mentor.description ?? ''}
                  placeholder="Detailed background, areas of mentorship expertise, guiding principles..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-zinc-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="verified"
                  defaultChecked={mentor.verified}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-zinc-800">
                  Verified Mentor badge (displays blue checkmark)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={mentor.featured}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-zinc-800">
                  Featured on Home Screen & Top Mentors
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Column: Stats & Meta ─────────────────────────────────── */}
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">Activity Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-2xl font-bold text-indigo-600">{mentor.sessions.length}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Recent Sessions</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-2xl font-bold text-amber-600">{mentor.discussions.length}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Discussions</p>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 text-xs space-y-2 text-zinc-600">
              <div className="flex justify-between">
                <span className="text-zinc-400">Created:</span>
                <span>{formatDateTime(mentor.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Published:</span>
                <span>{mentor.published_at ? formatDateTime(mentor.published_at) : 'Not published'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Rating Avg:</span>
                <span className="font-semibold text-amber-600">★ {Number(mentor.rating_avg ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Review Count:</span>
                <span>{mentor.rating_count ?? 0} reviews</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/mentorship/sessions`}
                className="block text-center rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
              >
                View all sessions →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Sessions for this Mentor ─────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Recent Session Bookings</h3>
            <p className="text-xs text-zinc-500">Student session requests directed to this mentor</p>
          </div>
          <Link
            href="/mentorship/sessions"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            View all sessions
          </Link>
        </div>

        {mentor.sessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">
            No session bookings for this mentor yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Topic / Message</th>
                  <th className="px-4 py-2.5 font-medium">Preferred Time</th>
                  <th className="px-4 py-2.5 font-medium">Mode</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {mentor.sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-800">{session.student_full_name ?? 'Student'}</p>
                      <p className="text-zinc-400 text-[11px]">{session.contact_email ?? session.student_email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-zinc-700 truncate">{session.topic}</p>
                      {session.message && (
                        <p className="text-zinc-400 text-[11px] truncate">{session.message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      {session.preferred_date ? formatDate(session.preferred_date) : 'Flexible'}{' '}
                      {session.preferred_time ? `(${session.preferred_time})` : ''}
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600">{session.session_mode ?? 'online'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${SESSION_STATUS_TONES[session.status] ?? 'bg-zinc-100 text-zinc-600'}`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {session.status === 'pending' && (
                          <form action={updateSessionStatusAction}>
                            <input type="hidden" name="id" value={session.id} />
                            <input type="hidden" name="status" value="confirmed" />
                            <button
                              type="submit"
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Confirm
                            </button>
                          </form>
                        )}
                        {session.status === 'confirmed' && (
                          <form action={updateSessionStatusAction}>
                            <input type="hidden" name="id" value={session.id} />
                            <input type="hidden" name="status" value="completed" />
                            <button
                              type="submit"
                              className="rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Complete
                            </button>
                          </form>
                        )}
                        {session.status !== 'cancelled' && session.status !== 'completed' && (
                          <form action={updateSessionStatusAction}>
                            <input type="hidden" name="id" value={session.id} />
                            <input type="hidden" name="status" value="cancelled" />
                            <button
                              type="submit"
                              className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100"
                            >
                              Cancel
                            </button>
                          </form>
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

      {/* ── Community Discussions posted by Mentor ──────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Community Discussions</h3>
            <p className="text-xs text-zinc-500">Posts by this mentor appearing in the mobile community tab</p>
          </div>
          <Link
            href="/mentorship/discussions"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Manage all discussions
          </Link>
        </div>

        {mentor.discussions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">
            No community posts by this mentor yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {mentor.discussions.map((d) => (
              <div key={d.id} className="p-4 flex items-start justify-between gap-4 hover:bg-zinc-50">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-zinc-900">{d.title}</h4>
                  <p className="text-xs text-zinc-600 line-clamp-2">{d.content}</p>
                  <p className="text-[11px] text-zinc-400 pt-1">
                    ❤️ {d.likes_count} likes · 💬 {d.comments_count} comments · Posted {formatDate(d.created_at)}
                  </p>
                </div>
                <form action={deleteDiscussionAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
