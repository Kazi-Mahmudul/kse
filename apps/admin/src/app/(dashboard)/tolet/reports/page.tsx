import Link from 'next/link';

import { formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Admin queue of `report_target_type='tolet_listing'` rows.
 *
 * Reports are written via the `tolet-actions` Edge Function (mobile) and
 * surface here for staff review. Resolution flow is intentionally simple —
 * open the listing, decide, mark `resolved_at` via Supabase studio or the
 * future /api/admin/reports endpoint.
 */
export default async function ToletReportsPage() {
  const admin = createAdminClient();

  const { data: reports, error } = await admin
    .from('reports')
    .select('id, target_id, reason, details, reporter_id, created_at, status, resolution_note, resolved_by')
    .eq('target_type', 'tolet_listing')
    .order('created_at', { ascending: false })
    .limit(50);

  // Resolve listing titles for context.
  const ids = Array.from(new Set((reports ?? []).map((r) => r.target_id)));
  const listingsLookup = new Map<string, { title: string; status: string }>();
  if (ids.length > 0) {
    const { data: listings } = await admin
      .from('opportunities')
      .select('id, title, status')
      .eq('type', 'tolet')
      .in('id', ids);
    for (const row of listings ?? []) {
      listingsLookup.set(row.id, { title: row.title, status: row.status });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/tolet" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Bachelor To-Let
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Reports
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Student-submitted reports for tolet listings
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          Could not load reports: {error.message}
        </p>
      ) : !reports || reports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-600">No reports to review.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {reports.map((report) => {
            const listing = listingsLookup.get(report.target_id);
            const resolved = report.status === 'resolved';
            return (
              <div
                key={report.id}
                className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4 ${
                  resolved ? 'border-zinc-200 bg-zinc-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tolet/${report.target_id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {listing?.title ?? report.target_id}
                    </Link>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                      {report.reason}
                    </span>
                    {listing?.status ? (
                      <span className="text-xs text-zinc-500">{listing.status}</span>
                    ) : null}
                  </div>
                  {report.details ? (
                    <p className="mt-1 text-sm text-zinc-700">{report.details}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-500">
                    Reported {formatDateTime(report.created_at)}
                    {resolved ? ` · resolved` : ''}
                  </p>
                </div>
                {!resolved ? (
                  <Link
                    href={`/tolet/${report.target_id}`}
                    className="h-9 rounded-lg border border-zinc-300 bg-white px-3 leading-9 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Open listing →
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
