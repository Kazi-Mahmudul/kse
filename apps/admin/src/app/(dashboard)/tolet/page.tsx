import Link from 'next/link';

import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  OPPORTUNITY_STATUS_OPTIONS,
  TOLET_LISTING_STATUS_LABELS,
  TOLET_ROOM_TYPE_LABELS,
} from '@kse/shared';
import type {
  ToletListingRow,
} from '@/features/tolet/types';

const PAGE_SIZE = 20;

const ROOM_OPTIONS = Object.entries(TOLET_ROOM_TYPE_LABELS);
const LISTING_STATUS_OPTIONS = Object.entries(TOLET_LISTING_STATUS_LABELS);

/** Bachelor To-Let admin list (spec bachelor-to-let §Admin). */
export default async function ToletListPage({
  searchParams,
}: PageProps<'/tolet'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const roomType = typeof params.room_type === 'string' ? params.room_type : '';
  const listingStatus = typeof params.listing_status === 'string' ? params.listing_status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  let query = admin
    .from('opportunities')
    .select(
      'id, title, city, area, room_type, rent_amount, rent_currency, listing_status, status, verified, updated_at, image_url',
      { count: 'exact' },
    )
    .eq('type', 'tolet')
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (roomType) {
    query = query.eq('room_type', roomType);
  }
  if (listingStatus) {
    query = query.eq('listing_status', listingStatus);
  }
  if (q) {
    const sanitized = q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (sanitized) {
      query = query.textSearch('search_vector', sanitized, {
        type: 'plain',
        config: 'simple',
      });
    }
  }

  const { data: rows, count, error } = await query
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (roomType) sp.set('room_type', roomType);
    if (listingStatus) sp.set('listing_status', listingStatus);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/tolet?${qs}` : '/tolet';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Bachelor To-Let
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} total — student-submitted rooms & sublets
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/tolet/pending"
            className="h-10 rounded-lg border border-amber-300 bg-amber-50 px-4 leading-10 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Pending review
          </Link>
          <Link
            href="/tolet/reports"
            className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 leading-10 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Reports
          </Link>
          <Link
            href="/tolet/new"
            className="h-10 rounded-lg bg-indigo-600 px-4 leading-10 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            New listing
          </Link>
        </div>
      </div>

      <form
        method="get"
        action="/tolet"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, area, city…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by workflow status"
        >
          <option value="">All statuses</option>
          {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="room_type"
          defaultValue={roomType}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by room type"
        >
          <option value="">All room types</option>
          {ROOM_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="listing_status"
          defaultValue={listingStatus}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by availability"
        >
          <option value="">Any availability</option>
          {LISTING_STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || status || roomType || listingStatus) && (
          <Link
            href="/tolet"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load Bachelor To-Let listings: {error.message}
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
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Rent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Availability</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(rows as ToletListingRow[]).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tolet/${row.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.title}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-400">
                      {row.verified ? '✓ verified' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {[row.area, row.city].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {row.room_type ? TOLET_ROOM_TYPE_LABELS[row.room_type] : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {row.rent_amount != null && row.rent_currency
                      ? `${row.rent_currency} ${row.rent_amount}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {TOLET_LISTING_STATUS_LABELS[row.listing_status]}
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
