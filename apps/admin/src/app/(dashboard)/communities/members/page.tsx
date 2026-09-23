import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  MemberRoleControls,
  RemoveMemberButton,
} from '@/features/communities/moderation-controls';

const PAGE_SIZE = 25;

interface MembershipRow {
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'owner';
  joined_at: string;
  community: { name: string; slug: string } | null;
  profile: { full_name: string | null } | null;
}

/**
 * Cross-community member directory (spec §Admin panel → Members): search by
 * member name or community, then manage roles / remove members per community.
 */
export default async function CommunityMembersPage({
  searchParams,
}: PageProps<'/communities/members'>) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const roleFilter = typeof params.role === 'string' ? params.role : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();
  const sanitized = q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();

  let query = admin
    .from('community_members')
    .select(
      'community_id, user_id, role, joined_at, community:communities(name, slug), ' +
        'profile:profiles!inner(full_name)',
      { count: 'exact' },
    )
    .order('joined_at', { ascending: false });

  if (sanitized) {
    query = query.or(
      `profile.full_name.ilike.%${sanitized}%,community.name.ilike.%${sanitized}%`,
    );
  }
  if (['member', 'moderator', 'owner'].includes(roleFilter)) {
    query = query.eq('role', roleFilter);
  }

  const { data: rows, count, error } = await query.range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

  const memberships = (rows ?? []) as unknown as MembershipRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (roleFilter) sp.set('role', roleFilter);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/communities/members?${qs}` : '/communities/members';
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Community members
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total} membership{total === 1 ? '' : 's'} across all communities.
      </p>

      <form
        method="get"
        action="/communities/members"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search member or community…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="member">Member</option>
          <option value="moderator">Moderator</option>
          <option value="owner">Owner</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || roleFilter) && (
          <Link
            href="/communities/members"
            className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load members: {error.message}
          </p>
        ) : memberships.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No memberships match.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Community</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr
                  key={`${membership.community_id}:${membership.user_id}`}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {membership.profile?.full_name ?? 'User'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/communities/${membership.community_id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {membership.community?.name ?? 'Community'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        membership.role === 'owner'
                          ? 'bg-indigo-50 text-indigo-700'
                          : membership.role === 'moderator'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {membership.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(membership.joined_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MemberRoleControls
                        communityId={membership.community_id}
                        userId={membership.user_id}
                        role={membership.role}
                      />
                      <RemoveMemberButton
                        communityId={membership.community_id}
                        userId={membership.user_id}
                      />
                    </div>
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
