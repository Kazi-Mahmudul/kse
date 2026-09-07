import { redirect } from 'next/navigation';

import { SidebarNav } from '@/components/sidebar-nav';
import { signOutAction } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { isStaff, primaryRole } from '@/lib/roles';
import { USER_ROLE_LABELS } from '@kse/shared';

/**
 * Server-side gate for every admin page: verified session + staff role
 * read from user_roles through RLS (never from client claims, spec §5/§10).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from('user_roles')
    .select('role');

  if (rolesError) {
    return (
      <AccessDenied
        email={user.email}
        message={`Could not verify your roles (${rolesError.message}). Try signing in again.`}
      />
    );
  }

  const roles = (roleRows ?? []).map((row) => row.role as string);

  if (!isStaff(roles)) {
    return (
      <AccessDenied
        email={user.email}
        message="This account does not have staff access. Ask a super admin to grant you a content manager, admin or super admin role."
      />
    );
  }

  const role = primaryRole(roles) ?? 'content_manager';

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            K
          </div>
          <span className="text-base font-semibold tracking-tight text-zinc-900">
            KSE Admin
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav />
        </div>

        <div className="border-t border-zinc-200 p-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {(user.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-900">{user.email}</p>
              <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                {USER_ROLE_LABELS[role]}
              </span>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}

function AccessDenied({ email, message }: { email: string | undefined; message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Access denied</h1>
        <p className="mt-2 text-sm text-zinc-500">{message}</p>
        {email && <p className="mt-1 text-xs text-zinc-400">Signed in as {email}</p>}
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="h-10 w-full rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
