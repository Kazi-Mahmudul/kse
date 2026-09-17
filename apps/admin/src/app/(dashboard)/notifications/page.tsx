import { formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  NotificationsComposeForm,
  type StudentOption,
  type UniversityOption,
} from '@/features/notifications/compose-form';

const RECENT_PAGE_SIZE = 10;

interface DeliveryRow {
  notification_id: string;
  status: string;
  sent_at: string | null;
}

interface RecentNotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
}

/**
 * Notification composer + recent delivery log (spec §18, step 17).
 *
 * Reads through the service-role client because the draft table carries
 * per-user rows the staff composer needs to fan-out to and inspect.
 */
export default async function NotificationsPage() {
  const admin = createAdminClient();

  const [
    { data: universityRows, error: universitiesError },
    { data: profileRows, error: studentsError },
    { data: recentRows, error: recentError },
    { data: authUsers },
  ] = await Promise.all([
    admin.from('universities').select('id, name').order('name'),
    admin
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true, nullsFirst: false })
      .limit(200),
    admin
      .from('notifications')
      .select('id, type, title, body, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, RECENT_PAGE_SIZE - 1),
    // profiles carries no email column — emails live only in auth.users.
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const universities: UniversityOption[] = (universityRows ?? []).map(
    (row: { id: string; name: string }) => ({ id: row.id, name: row.name }),
  );

  const emailByUserId = new Map(
    (authUsers?.users ?? []).map((user) => [user.id, user.email ?? '']),
  );

  const students: StudentOption[] = ((profileRows ?? []) as unknown as {
    id: string;
    full_name: string | null;
  }[]).map((row) => {
    const name = (row.full_name ?? '').trim();
    const email = emailByUserId.get(row.id) ?? '';
    return {
      id: row.id,
      label:
        name && email ? `${name} (${email})` : name || email || row.id,
    };
  });

  // Group deliveries by notification (no FK in either direction on the
  // notifications → notification_deliveries embed, so we fetch separately —
  // scoped to the recent page's ids instead of the whole table).
  const recentIds = recentRows?.map((row) => (row as { id: string }).id) ?? [];
  const { data: deliveryRows } = recentIds.length
    ? await admin
        .from('notification_deliveries')
        .select('notification_id, status, sent_at')
        .in('notification_id', recentIds)
    : { data: [] as DeliveryRow[] };

  const deliveryCountByNotification = new Map<string, number>();
  ((deliveryRows ?? []) as unknown as DeliveryRow[]).forEach((row) => {
    deliveryCountByNotification.set(
      row.notification_id,
      (deliveryCountByNotification.get(row.notification_id) ?? 0) + 1,
    );
  });

  const recent: RecentNotificationRow[] = ((recentRows ?? []) as unknown as RecentNotificationRow[]).filter(
    (row) => (deliveryCountByNotification.get(row.id) ?? 0) > 0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Send one-off announcements to students. All deliveries appear in
            each user&rsquo;s in-app inbox and feed the next push-notification run.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900">
          Compose a notification
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Title and body are required (3+ characters each). Add an opportunity
          id only if you want the bell badge to deep-link into that detail.
        </p>

        {universitiesError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Could not load universities: {universitiesError.message}
          </p>
        )}
        {studentsError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Could not load recipients: {studentsError.message}
          </p>
        )}

        <div className="mt-6">
          <NotificationsComposeForm
            universities={universities}
            students={students}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900">Recent deliveries</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Most recent notifications written to user inboxes (in_app channel).
        </p>

        {recentError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Could not load recent notifications: {recentError.message}
          </p>
        )}

        {!recentError && recent.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-600">No notifications sent yet.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Composed notifications appear here once delivered.
            </p>
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Recipients</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-zinc-900">{row.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.body}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs font-medium text-zinc-600">
                      {row.type}
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-700">
                      {deliveryCountByNotification.get(row.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-zinc-500">
                      {formatDateTime(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
