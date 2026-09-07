import Link from 'next/link';

import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  OPPORTUNITY_STATUS_OPTIONS,
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_TYPE_OPTIONS,
} from '@kse/shared';
import type { OpportunityStatus, OpportunityType } from '@kse/types';

const PAGE_SIZE = 20;

interface ListRow {
  id: string;
  type: OpportunityType;
  title: string;
  organization_name: string;
  status: OpportunityStatus;
  deadline: string | null;
  featured: boolean;
  verified: boolean;
  updated_at: string;
}

/** Opportunity list with search + type/status filters (spec §7). */
export default async function OpportunitiesPage({
  searchParams,
}: PageProps<'/opportunities'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const type = typeof params.type === 'string' ? params.type : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  let query = admin
    .from('opportunities')
    .select(
      'id, type, title, organization_name, status, deadline, featured, verified, updated_at',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (q) {
    // Strip tsquery operators; Bangla/English words both work with 'simple'.
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
    if (type) sp.set('type', type);
    if (status) sp.set('status', status);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/opportunities?${qs}` : '/opportunities';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Opportunities
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} total — internships, scholarships, events, workshops, mentorship
          </p>
        </div>
        <Link
          href="/opportunities/new"
          className="h-10 rounded-lg bg-indigo-600 px-4 leading-10 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          New opportunity
        </Link>
      </div>

      <form
        method="get"
        action="/opportunities"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, summary, organization…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="type"
          defaultValue={type}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {OPPORTUNITY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
          {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || type || status) && (
          <Link
            href="/opportunities"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load opportunities: {error.message}
          </p>
        ) : !rows || rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No opportunities match.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Create the first one or relax the filters.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(rows as ListRow[]).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/opportunities/${row.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.title}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-400">
                      {row.featured ? '★ ' : ''}
                      {row.verified ? '✓ ' : ''}
                    </span>
                    <div className="text-xs text-zinc-400">{row.organization_name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {OPPORTUNITY_TYPE_LABELS[row.type]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {formatDate(row.deadline)}
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
