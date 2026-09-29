import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  HUB_LISTING_STATUS_LABELS,
  HUB_SERVICE_TYPE_LABELS,
} from '@kse/shared';
import type { HubListingStatus } from '@kse/types';

import { HubStatusBadge } from '@/features/hub/hub-status-badge';
import type { HubListingRow } from '@/features/hub/types';

const PAGE_SIZE = 20;

/** Student Hub admin — listings list (spec student-hub §19). */
export default async function HubListPage({
  searchParams,
}: PageProps<'/hub'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const verified = typeof params.verified === 'string' ? params.verified : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  let query = admin
    .from('student_hub_listings')
    .select(
      'id, name, service_type, area, city, status, verified, has_student_discount, updated_at, category:student_hub_categories(id, name)',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status as HubListingStatus);
  if (category) query = query.eq('category_id', category);
  if (verified === 'yes') query = query.eq('verified', true);
  if (verified === 'no') query = query.eq('verified', false);
  if (q) {
    const sanitized = q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (sanitized) {
      query = query.textSearch('search_vector', sanitized, {
        type: 'plain',
        config: 'simple',
      });
    }
  }

  const [{ data: rows, count, error }, { data: categories }] = await Promise.all([
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    admin.from('student_hub_categories').select('id, name').order('sort_order'),
  ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (category) sp.set('category', category);
    if (verified) sp.set('verified', verified);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/hub?${qs}` : '/hub';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Student Hub
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} local listings — shops, services, parking & deals
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/hub/pending"
            className="h-10 rounded-lg border border-amber-300 bg-amber-50 px-4 leading-10 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Pending review
          </Link>
          <Link
            href="/hub/reports"
            className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 leading-10 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Reports
          </Link>
          <Link
            href="/hub/categories"
            className="h-10 rounded-lg border border-zinc-300 bg-white px-4 leading-10 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Categories
          </Link>
          <Link
            href="/hub/new"
            className="h-10 rounded-lg bg-indigo-600 px-4 leading-10 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            New listing
          </Link>
        </div>
      </div>

      <form method="get" action="/hub" className="mt-6 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, area, services…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="category"
          defaultValue={category}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(HUB_LISTING_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="verified"
          defaultValue={verified}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by verification"
        >
          <option value="">Any verification</option>
          <option value="yes">Verified only</option>
          <option value="no">Unverified only</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || status || category || verified) && (
          <Link href="/hub" className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load listings: {error.message}
          </p>
        ) : !rows || rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No listings match.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Create the first one or relax the filters.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(rows as (HubListingRow & { category?: { name?: string } | null })[]).map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/hub/${row.id}`} className="font-medium text-indigo-600 hover:underline">
                      {row.name}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-400">
                      {row.verified ? '✓ verified' : ''}
                      {row.has_student_discount ? ' · 🎓 discount' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {row.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {HUB_SERVICE_TYPE_LABELS[row.service_type]}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {[row.area, row.city].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <HubStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(row.updated_at)}
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
