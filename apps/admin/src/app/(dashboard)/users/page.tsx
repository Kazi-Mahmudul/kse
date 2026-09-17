import { ConfirmSubmit } from '@/components/confirm-submit';
import { formatDate } from '@/lib/format';
import {
  setUserRoleAction,
  setUserStatusAction,
  setUserVerifiedAction,
} from '@/features/users/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { USER_ROLE_LABELS } from '@kse/shared';
import type { UserRole } from '@kse/types';

const PAGE_SIZE = 20;
const MAX_PROFILES = 1000;

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_verified: boolean;
  status: 'active' | 'suspended';
  created_at: string;
  university: { name: string } | null;
}

/**
 * User management (spec §7): search, suspend/reactivate, verify and role
 * assignment. Reads combine profiles (service role), user_roles and
 * auth.users emails; filtering happens in memory because name lives in
 * profiles, email in auth.users and roles in user_roles.
 */
export default async function UsersPage({
  searchParams,
}: PageProps<'/users'>) {
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q.trim() : '').toLowerCase();
  const statusFilter =
    typeof params.status === 'string' && ['active', 'suspended'].includes(params.status)
      ? (params.status as 'active' | 'suspended')
      : null;
  const roleFilter =
    typeof params.role === 'string' && params.role ? params.role : '';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const session = await createClient();
  const { data: { user: staffUser } } = await session.auth.getUser();

  const admin = createAdminClient();
  const [{ data: profileRows, error }, { data: roleRows }, { data: authUsers }] =
    await Promise.all([
      admin
        .from('profiles')
        .select(
          'id, full_name, phone, is_verified, status, created_at, university:universities(name)',
        )
        .order('created_at', { ascending: false })
        .limit(MAX_PROFILES),
      admin.from('user_roles').select('user_id, role'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const emailByUserId = new Map(
    (authUsers?.users ?? []).map((user) => [user.id, (user.email ?? '').toLowerCase()]),
  );
  const rolesByUser = new Map<string, UserRole[]>();
  for (const row of (roleRows ?? []) as { user_id: string; role: UserRole }[]) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role);
    rolesByUser.set(row.user_id, list);
  }

  // In-memory filter: name (profiles), email (auth.users), status, role.
  let users = ((profileRows ?? []) as unknown as ProfileRow[]).map((row) => ({
    ...row,
    email: emailByUserId.get(row.id) ?? '',
    roles: rolesByUser.get(row.id) ?? [],
  }));
  if (q) {
    users = users.filter(
      (user) =>
        (user.full_name ?? '').toLowerCase().includes(q) ||
        user.email.includes(q),
    );
  }
  if (statusFilter) {
    users = users.filter((user) => user.status === statusFilter);
  }
  if (roleFilter) {
    users = users.filter((user) => user.roles.includes(roleFilter as UserRole));
  }

  const total = users.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (statusFilter) sp.set('status', statusFilter);
    if (roleFilter) sp.set('role', roleFilter);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/users?${qs}` : '/users';
  };

  const grantableRoles = (
    Object.keys(USER_ROLE_LABELS) as UserRole[]
  ).filter((role) => role !== 'student');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Users
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} profile{total === 1 ? '' : 's'} — search, suspend or
            reactivate accounts, verify users and assign roles.
          </p>
        </div>
      </div>

      <form method="get" action="/users" className="mt-6 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="h-10 min-w-56 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
        />
        <select
          name="status"
          defaultValue={statusFilter ?? ''}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          name="role"
          defaultValue={roleFilter}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {USER_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Apply
        </button>
        {(q || statusFilter || roleFilter) && (
          <a href="/users" className="px-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            Reset
          </a>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {error ? (
          <p className="p-6 text-sm text-red-600">
            Could not load users: {error.message}
          </p>
        ) : pageRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-zinc-600">No users match.</p>
            <p className="mt-1 text-xs text-zinc-400">Relax the filters or try another search.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">University</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((user) => {
                const isSelf = user.id === staffUser?.id;
                return (
                  <tr key={user.id} className="border-b border-zinc-100 align-top last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">
                        {user.full_name?.trim() || 'Unnamed'}
                        {user.is_verified && (
                          <span className="ml-1 text-sky-600" title="Verified">✓</span>
                        )}
                        {isSelf && (
                          <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-400">{user.email || user.id}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      {user.university?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.roles.length === 0 && (
                          <span className="text-xs text-zinc-400">No roles</span>
                        )}
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                          >
                            {USER_ROLE_LABELS[role] ?? role}
                            {!isSelf && (
                              <form action={setUserRoleAction}>
                                <input type="hidden" name="userId" value={user.id} />
                                <input type="hidden" name="role" value={role} />
                                <input type="hidden" name="grant" value="false" />
                                <button
                                  type="submit"
                                  aria-label={`Remove ${USER_ROLE_LABELS[role] ?? role} role`}
                                  className="text-zinc-400 transition hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </form>
                            )}
                          </span>
                        ))}
                        <form action={setUserRoleAction} className="inline-flex items-center gap-1">
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="grant" value="true" />
                          <select
                            name="role"
                            defaultValue=""
                            aria-label={`Grant a role to ${user.full_name ?? user.email}`}
                            className="h-7 rounded-md border border-zinc-300 bg-white px-1.5 text-xs text-zinc-700"
                          >
                            <option value="">Add role…</option>
                            {grantableRoles.map((role) => (
                              <option key={role} value={role}>
                                {USER_ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="h-7 rounded-md border border-zinc-300 px-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                          >
                            Grant
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.status === 'suspended'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {user.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={setUserVerifiedAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input
                            type="hidden"
                            name="verified"
                            value={user.is_verified ? 'false' : 'true'}
                          />
                          <button
                            type="submit"
                            className="h-8 rounded-lg border border-zinc-300 px-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                          >
                            {user.is_verified ? 'Unverify' : 'Verify'}
                          </button>
                        </form>
                        {!isSelf && (
                          <form action={setUserStatusAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={user.status === 'suspended' ? 'active' : 'suspended'}
                            />
                            {user.status === 'suspended' ? (
                              <button
                                type="submit"
                                className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <ConfirmSubmit
                                label="Suspend"
                                message={`Suspend ${(user.full_name ?? 'this user').trim()}? They keep their data but are blocked from the app.`}
                                className="h-8 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                              />
                            )}
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
              <a
                href={pageHref(page - 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={pageHref(page + 1)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
