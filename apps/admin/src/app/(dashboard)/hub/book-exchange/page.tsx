import { ConfirmSubmit } from '@/components/confirm-submit';
import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { BOOK_CONDITION_LABELS, BOOK_INTENT_LABELS, BOOK_STATUS_LABELS } from '@kse/shared';

import { setBookListingStatusAction } from '@/features/hub/actions';

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  intent: string;
  condition: string;
  price: number | null;
  status: string;
  updated_at: string;
  owner?: { full_name?: string | null } | null;
}

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  reserved: 'bg-amber-50 text-amber-700',
  exchanged: 'bg-sky-50 text-sky-700',
  sold: 'bg-zinc-100 text-zinc-500',
  removed: 'bg-red-50 text-red-700',
};

/** Book Exchange Corner moderation (spec student-hub §10/§17). */
export default async function HubBookExchangePage() {
  const admin = createAdminClient();

  const { data: rows_raw } = await admin
    .from('student_book_listings')
    .select(
      'id, title, author, intent, condition, price, status, updated_at, ' +
        'owner:profiles!student_book_listings_owner_id_fkey(full_name)',
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  const rows = (rows_raw ?? []) as unknown as BookRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Book Exchange
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {rows.length} student book listing(s) — students manage their own
        listings; use removal for policy violations.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {!rows || rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-zinc-500">
            No book listings yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Intent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{row.title}</p>
                    <p className="text-xs text-zinc-400">
                      {row.author ?? '—'} · {BOOK_CONDITION_LABELS[row.condition as keyof typeof BOOK_CONDITION_LABELS]}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {row.owner?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {BOOK_INTENT_LABELS[row.intent as keyof typeof BOOK_INTENT_LABELS]}
                    {row.intent === 'sell' && row.price != null
                      ? ` · BDT ${(row.price / 100).toLocaleString('en-IN')}`
                      : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[row.status]}`}
                    >
                      {BOOK_STATUS_LABELS[row.status as keyof typeof BOOK_STATUS_LABELS]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(row.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    {row.status !== 'removed' ? (
                      <form action={setBookListingStatusAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="status" value="removed" />
                        <ConfirmSubmit
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          label="Remove"
                          message="Remove this book listing for policy violation?"
                        />
                      </form>
                    ) : (
                      <form action={setBookListingStatusAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="status" value="active" />
                        <ConfirmSubmit
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
                          label="Restore"
                          message="Restore this book listing?"
                        />
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
