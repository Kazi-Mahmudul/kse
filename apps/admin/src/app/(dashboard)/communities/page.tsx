import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ContentStatus } from '@kse/types';

const PAGE_SIZE = 20;

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  status: ContentStatus;
  description: string | null;
  created_at: string;
  member_count: number;
  university: { name: string } | null;
  category: { name: string } | null;
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  active: 'Active',
  hidden: 'Hidden',
  removed: 'Removed',
  archived: 'Archived',
};

/**
 * Community management (spec §7): list communities with member count +
 * quick toggle between active / hidden. Removal goes through the same
 * field but the hidden status is the default moderation step.
 */
export default async function CommunitiesPage({
  searchParams,
}: PageProps<'/communities'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const status = typeof params.status === 'string' ? params.status : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();
  const categoryId = typeof params.category === 'string' ? params.category : '';

  let query = admin
    .from('communities')
    .select(
      'id, name, slug, status, description, created_at, member_count, ' +
        'university:universities(name), category:community_categories(id, name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  const sanitized = q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (sanitized) {
    query = query.or(
      `name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%,description.ilike.%${sanitized}%`,
    );
  }

  const [{ data: rows, count, error }, { data: categories }] = await Promise.all([
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    admin.from('community_categories').select('id, name').order('sort_order'),
  ]);

  const communities = (rows ?? []) as unknown as CommunityRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (categoryId) sp.set('category', categoryId);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/communities?${qs}` : '/communities';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Communities
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} communit{total === 1 ? 'y' : 'ies'} —
            see membership + posts on the detail screen.
          </p>
        </div>
        <Link
          href="/communities/new"
          className="h-10 rounded-lg bg-indigo-600 px-4 leading-10 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          New community
        </Link>
      </div>

      <form
        method="get"
        action="/communities"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, description…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden (suspended)</option>
          <option value="removed">Removed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          name="category"
          defaultValue={categoryId}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {((categories ?? []) as { id: string; name: string }[]).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || status || categoryId) && (
          <Link
            href="/communities"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load communities: {error.message}
          </p>
        ) : communities.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No communities match.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Create the first one with “New community” above.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Community</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">University</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((community) => (
                <tr
                  key={community.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/communities/${community.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {community.name}
                    </Link>
                    <div className="text-xs text-zinc-400">/{community.slug}</div>
                    {community.description && (
                      <div className="text-xs text-zinc-400">
                        {community.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {community.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {community.university?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {community.member_count}
                  </td>
                  <td className="px-4 py-3">
                    {community.status === 'active' ? (
                      <span className="inline-block whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {STATUS_LABELS[community.status]}
                      </span>
                    ) : community.status === 'hidden' ? (
                      <span className="inline-block whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {STATUS_LABELS[community.status]}
                      </span>
                    ) : (
                      <span className="inline-block whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                        {STATUS_LABELS[community.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(community.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/communities/${community.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      Manage →
                    </Link>
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
