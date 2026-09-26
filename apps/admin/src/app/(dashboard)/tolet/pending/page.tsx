import Link from 'next/link';

import { setToletStatusAction } from '@/features/tolet/actions';
import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { TOLET_ROOM_TYPE_LABELS } from '@kse/shared';

/**
 * Admin pending-review queue for Bachelor To-Let.
 *
 * Surfaces every tolet row in `status='pending_review'` with one-click
 * Approve / Reject buttons. Bulk admin work happens here.
 */
export default async function ToletPendingPage() {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('opportunities')
    .select('id, title, city, area, room_type, landlord_phone, created_at, updated_at')
    .eq('type', 'tolet')
    .eq('status', 'pending_review')
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <div>
        <Link href="/tolet" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Bachelor To-Let
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Pending review
        </h1>
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          Could not load pending listings: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/tolet" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Bachelor To-Let
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Pending review
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rows?.length ?? 0} awaiting approval
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {!rows || rows.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
            <p className="text-sm text-zinc-600">All caught up — no pending listings.</p>
            <p className="mt-1 text-xs text-zinc-400">
              New submissions land here for staff moderation.
            </p>
          </div>
        ) : (
          rows.map((row) => {
            const location = [row.area, row.city].filter(Boolean).join(', ');
            const roomType = row.room_type as keyof typeof TOLET_ROOM_TYPE_LABELS | null;
            const roomLabel = roomType && roomType in TOLET_ROOM_TYPE_LABELS
              ? TOLET_ROOM_TYPE_LABELS[roomType]
              : '—';
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/tolet/${row.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>{location || '—'}</span>
                    <span>{roomLabel}</span>
                    {row.landlord_phone ? <span>📞 {row.landlord_phone}</span> : null}
                    <span>Submitted {formatDate(row.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={setToletStatusAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button
                      type="submit"
                      className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </form>
                  <form action={setToletStatusAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="published" />
                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Approve
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
