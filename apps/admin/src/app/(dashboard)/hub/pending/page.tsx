import Link from 'next/link';

import { ConfirmSubmit } from '@/components/confirm-submit';
import { formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { HUB_SERVICE_TYPE_LABELS } from '@kse/shared';

import { setHubListingStatusAction } from '@/features/hub/actions';

interface PendingRow {
  id: string;
  name: string;
  service_type: string;
  summary: string | null;
  area: string | null;
  city: string;
  phone: string | null;
  opening_hours: string | null;
  created_at: string;
  submitted_by: string | null;
  submitter?: { full_name?: string | null } | null;
  category?: { name?: string | null } | null;
}

const inputClass =
  'h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

/**
 * Pending review queue — user-submitted suggestions (spec student-hub §22).
 * Nothing user-submitted is auto-published; approve/reject notifies the student.
 */
export default async function HubPendingPage() {
  const admin = createAdminClient();

  const { data: rows_raw } = await admin
    .from('student_hub_listings')
    .select(
      'id, name, service_type, summary, area, city, phone, opening_hours, created_at, ' +
        'submitted_by, submitter:profiles!student_hub_listings_submitted_by_fkey(full_name), ' +
        'category:student_hub_categories(name)',
    )
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  const rows = (rows_raw ?? []) as unknown as PendingRow[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Pending review
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows?.length ?? 0} student-submitted listing(s) waiting for review
          </p>
        </div>
        <Link
          href="/hub"
          className="text-sm font-medium text-indigo-600 transition hover:underline"
        >
          ← All listings
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {!rows || rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
            Nothing to review — submissions from the app land here.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{row.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {row.category?.name ?? '—'} ·{' '}
                    {HUB_SERVICE_TYPE_LABELS[row.service_type as keyof typeof HUB_SERVICE_TYPE_LABELS]}{' '}
                    · {[row.area, row.city].filter(Boolean).join(', ')}
                    {row.phone ? ` · ${row.phone}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Suggested by {row.submitter?.full_name ?? 'a student'} ·{' '}
                    {formatDateTime(row.created_at)}
                  </p>
                </div>
                <Link
                  href={`/hub/${row.id}`}
                  className="text-sm font-medium text-indigo-600 transition hover:underline"
                >
                  Open full editor →
                </Link>
              </div>
              {row.summary ? (
                <p className="mt-3 text-sm text-zinc-600">{row.summary}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <form action={setHubListingStatusAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value="published" />
                  <ConfirmSubmit
                    className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    label="Approve & publish"
                    message="Approve and publish this listing? The student will be notified."
                  />
                </form>
                <form action={setHubListingStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <input
                    name="review_note"
                    placeholder="Rejection note (sent to the student)"
                    className={inputClass}
                  />
                  <ConfirmSubmit
                    className="h-9 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    label="Reject"
                    message="Reject this submission? The student will be notified."
                  />
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
