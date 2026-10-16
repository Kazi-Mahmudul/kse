import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import { getMentorQuestions, PAGE_SIZE } from '@/features/mentorship/queries';
import { answerQuestionAction, closeQuestionAction } from '@/features/mentorship/actions';

const STATUS_FILTERS = [
  { value: '', label: 'All Questions' },
  { value: 'pending', label: 'Needs Answer' },
  { value: 'answered', label: 'Answered' },
  { value: 'closed', label: 'Closed' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  'General Guidance': 'bg-blue-50 text-blue-700 border-blue-200',
  'Career Advice': 'bg-purple-50 text-purple-700 border-purple-200',
  'Higher Studies': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Technical Skills': 'bg-amber-50 text-amber-700 border-amber-200',
  'Resume & Interview': 'bg-rose-50 text-rose-700 border-rose-200',
};

export default async function MentorQuestionsPage({
  searchParams,
}: PageProps<'/mentorship/questions'>) {
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const { rows, total } = await getMentorQuestions({ status, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/mentorship/questions?${qs}` : '/mentorship/questions';
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
            <span className="text-zinc-800">Questions</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Free Student Q&A
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review questions submitted by students, post authoritative mentor answers, and curate answers published to the app.
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
          { href: '/mentorship/questions', label: 'Questions', active: true },
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

      {/* ── Status Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const isSelected = status === f.value;
          const href = f.value ? `/mentorship/questions?status=${f.value}` : '/mentorship/questions';
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

      {/* ── Question Cards ──────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-700">No questions found</p>
          <p className="mt-1 text-xs text-zinc-400">
            There are no student questions matching this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      CATEGORY_COLORS[q.category] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {q.category}
                  </span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs text-zinc-600 font-medium">
                    Asked by {q.student_full_name ?? 'Student'}{q.student_email ? ` (${q.student_email})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">
                    {formatDateTime(q.created_at)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                      q.status === 'answered'
                        ? 'bg-emerald-50 text-emerald-700'
                        : q.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <p className="text-sm font-semibold text-zinc-900 leading-relaxed">
                  &ldquo;{q.question}&rdquo;
                </p>
              </div>

              {/* If already answered */}
              {q.answer ? (
                <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">
                      ✓ Published Mentor Answer
                    </span>
                    {q.answered_at && (
                      <span className="text-[11px] text-emerald-700">
                        {formatDateTime(q.answered_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
                    {q.answer}
                  </p>

                  <details className="pt-2 text-xs">
                    <summary className="cursor-pointer text-indigo-600 font-medium hover:underline">
                      Edit answer
                    </summary>
                    <form action={answerQuestionAction} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={q.id} />
                      <textarea
                        name="answer"
                        defaultValue={q.answer}
                        rows={3}
                        required
                        className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                      >
                        Update Answer
                      </button>
                    </form>
                  </details>
                </div>
              ) : (
                /* Needs answer form */
                <div className="space-y-3 pt-1">
                  <form action={answerQuestionAction} className="space-y-3">
                    <input type="hidden" name="id" value={q.id} />
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Write Answer to Student:
                      </label>
                      <textarea
                        name="answer"
                        rows={3}
                        placeholder="Write comprehensive, helpful guidance for this student..."
                        required
                        className="w-full rounded-lg border border-zinc-300 p-3 text-xs text-zinc-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 transition"
                      >
                        Publish Answer
                      </button>
                    </div>
                  </form>
                  {q.status !== 'closed' && (
                    <form action={closeQuestionAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition"
                      >
                        Close without answering
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages} ({total} questions)
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
