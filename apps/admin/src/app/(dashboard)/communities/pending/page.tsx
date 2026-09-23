import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ApproveRequestForm,
  RejectRequestForm,
} from '@/features/communities/review-controls';

const PAGE_SIZE = 20;

interface RequestRow {
  id: string;
  name: string;
  description: string;
  purpose: string | null;
  proposed_rules: string[];
  image_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
  requested_by: string;
  category: { name: string } | null;
  university: { name: string } | null;
  department: { name: string } | null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

const STATUS_PILLS: Record<RequestRow['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-zinc-100 text-zinc-600',
};

/**
 * Community creation requests (spec §Community creation): students request →
 * admins approve (creates the public community) or reject with a reason.
 */
export default async function PendingCommunitiesPage({
  searchParams,
}: PageProps<'/communities/pending'>) {
  const params = await searchParams;
  const statusFilter =
    params.status === 'approved' || params.status === 'rejected' ? params.status : 'pending';
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();
  const { data: rows, count, error } = await admin
    .from('community_requests')
    .select(
      'id, name, description, purpose, proposed_rules, image_url, status, review_note, ' +
        'created_at, requested_by, category:community_categories(name), ' +
        'university:universities(name), department:departments(name)',
      { count: 'exact' },
    )
    .eq('status', statusFilter)
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const requests = (rows ?? []) as unknown as RequestRow[];
  const total = count ?? 0;

  const requesterIds = Array.from(new Set(requests.map((r) => r.requested_by)));
  const { data: profiles } =
    requesterIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', requesterIds)
      : { data: [] };
  const names = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? 'User',
    ]),
  );

  const pageHref = (target: number) =>
    `/communities/pending?status=${statusFilter}${target > 1 ? `&page=${target}` : ''}`;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Pending requests
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total} request{total === 1 ? '' : 's'} · approving creates the community with the
        requester as owner.
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        {(['pending', 'approved', 'rejected'] as const).map((value) => (
          <Link
            key={value}
            href={`/communities/pending?status=${value}`}
            className={`rounded-lg px-3 py-1.5 font-medium capitalize transition ${
              statusFilter === value
                ? 'bg-indigo-600 text-white'
                : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {value}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load requests: {error.message}
          </p>
        )}
        {!error && requests.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
            <p className="text-sm text-zinc-600">
              No {statusFilter} community requests.
            </p>
          </div>
        )}
        {requests.map((request) => (
          <article
            key={request.id}
            className="rounded-xl border border-zinc-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-900">
                    {request.name}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILLS[request.status]}`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {names.get(request.requested_by) ?? 'User'} · {formatDate(request.created_at)}
                  {request.category ? ` · ${request.category.name}` : ''}
                  {request.university ? ` · ${request.university.name}` : ''}
                  {request.department ? ` · ${request.department.name}` : ''}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-zinc-600">{request.description}</p>
            {request.purpose && (
              <p className="mt-2 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">Purpose:</span> {request.purpose}
              </p>
            )}
            {Array.isArray(request.proposed_rules) && request.proposed_rules.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-zinc-500">
                {request.proposed_rules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            )}
            {request.review_note && (
              <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                Review note: {request.review_note}
              </p>
            )}

            {request.status === 'pending' && (
              <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
                <ApproveRequestForm
                  requestId={request.id}
                  suggestedSlug={slugify(request.name)}
                />
                <RejectRequestForm requestId={request.id} />
              </div>
            )}
          </article>
        ))}
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
