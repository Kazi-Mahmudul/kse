import Link from 'next/link';

import { ConfirmSubmit } from '@/components/confirm-submit';
import { formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { HUB_REPORT_REASON_LABELS } from '@kse/shared';
import type { HubReportReason } from '@kse/types';

import { resolveHubReportAction } from '@/features/hub/actions';

interface ReportRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution_note: string | null;
  created_at: string;
  reporter?: { full_name?: string | null } | null;
}

const inputClass =
  'h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20';

const TARGET_LABELS: Record<string, string> = {
  student_hub_listing: 'Listing',
  book_listing: 'Book listing',
  research_profile: 'Research profile',
};

const STATUS_TONES: Record<string, string> = {
  open: 'bg-red-50 text-red-700',
  reviewing: 'bg-amber-50 text-amber-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  dismissed: 'bg-zinc-100 text-zinc-500',
};

/** Reports for all Student Hub surfaces (spec student-hub §23). */
export default async function HubReportsPage() {
  const admin = createAdminClient();

  const { data: rows_raw } = await admin
    .from('reports')
    .select(
      'id, target_type, target_id, reason, details, status, created_at, ' +
        'reporter:profiles!reports_reporter_id_fkey(full_name)',
    )
    .in('target_type', ['student_hub_listing', 'book_listing', 'research_profile'])
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (rows_raw ?? []) as unknown as ReportRow[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Student Hub reports
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows?.length ?? 0} report(s) across listings, books and research profiles
          </p>
        </div>
        <Link href="/hub" className="text-sm font-medium text-indigo-600 transition hover:underline">
          ← All listings
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {!rows || rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
            No reports — nothing flagged by students right now.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {TARGET_LABELS[row.target_type] ?? row.target_type}
                    <span className="ml-2 text-xs text-zinc-400">{row.target_id.slice(0, 8)}…</span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {HUB_REPORT_REASON_LABELS[row.reason as HubReportReason] ?? row.reason} ·
                    reported by {row.reporter?.full_name ?? 'a student'} ·{' '}
                    {formatDateTime(row.created_at)}
                  </p>
                  {row.details ? (
                    <p className="mt-2 text-sm text-zinc-600">{row.details}</p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[row.status] ?? ''}`}
                >
                  {row.status}
                </span>
              </div>

              {row.target_type === 'student_hub_listing' ? (
                <Link
                  href={`/hub/${row.target_id}`}
                  className="mt-3 inline-block text-sm font-medium text-indigo-600 transition hover:underline"
                >
                  Open the reported listing →
                </Link>
              ) : null}

              {row.status === 'open' || row.status === 'reviewing' ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={resolveHubReportAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="reviewing" />
                    <input
                      name="resolution_note"
                      placeholder="Resolution note (optional)"
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Mark reviewing
                    </button>
                  </form>
                  <form action={resolveHubReportAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="resolved" />
                    <ConfirmSubmit
                      className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      label="Resolve"
                      message="Mark this report resolved?"
                    />
                  </form>
                  <form action={resolveHubReportAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <ConfirmSubmit
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100"
                      label="Dismiss"
                      message="Dismiss this report?"
                    />
                  </form>
                </div>
              ) : row.resolution_note ? (
                <p className="mt-3 text-xs text-zinc-500">
                  Resolution: {row.resolution_note}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
