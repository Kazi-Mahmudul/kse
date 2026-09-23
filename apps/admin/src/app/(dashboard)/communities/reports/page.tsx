import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { ResolveReportForm } from '@/features/communities/review-controls';

const PAGE_SIZE = 20;

const COMMUNITY_TARGETS = [
  'community',
  'community_post',
  'community_comment',
  'community_event',
  'community_poll',
] as const;

type CommunityReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'scam'
  | 'misleading'
  | 'other';

const COMMUNITY_REASONS: CommunityReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'scam',
  'misleading',
  'other',
];

interface ReportRow {
  id: string;
  target_type: (typeof COMMUNITY_TARGETS)[number];
  target_id: string;
  reason: CommunityReportReason;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  created_at: string;
  reporter_id: string;
}

const STATUS_PILLS: Record<ReportRow['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  reviewing: 'bg-sky-50 text-sky-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  dismissed: 'bg-zinc-100 text-zinc-600',
};

const REMOVABLE_TARGETS = new Set(COMMUNITY_TARGETS);

/**
 * Resolve a community_id for a report so the community filter can scope
 * the queue. `community` reports point at the community directly;
 * `community_post` / `community_event` rows have community_id; comments
 * resolve via their parent post.
 */
async function resolveCommunityIds(
  admin: ReturnType<typeof createAdminClient>,
  rows: ReportRow[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const postIds = rows.filter((r) => r.target_type === 'community_post').map((r) => r.target_id);
  const eventIds = rows.filter((r) => r.target_type === 'community_event').map((r) => r.target_id);
  const commentIds = rows
    .filter((r) => r.target_type === 'community_comment')
    .map((r) => r.target_id);

  const [posts, events, comments] = await Promise.all([
    postIds.length
      ? admin.from('community_posts').select('id, community_id').in('id', postIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? admin.from('community_events').select('id, community_id').in('id', eventIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? admin.from('community_comments').select('id, post_id').in('id', commentIds)
      : Promise.resolve({ data: [] }),
  ]);

  for (const row of (posts.data ?? []) as { id: string; community_id: string | null }[]) {
    if (row.community_id) out.set(`community_post:${row.id}`, row.community_id);
  }
  for (const row of (events.data ?? []) as { id: string; community_id: string | null }[]) {
    if (row.community_id) out.set(`community_event:${row.id}`, row.community_id);
  }
  for (const row of (comments.data ?? []) as { id: string; post_id: string }[]) {
    out.set(`community_comment:${row.id}:post`, row.post_id);
  }
  // Second hop: parent posts of comments.
  const parentIds = Array.from(new Set(((comments.data ?? []) as { post_id: string }[]).map((c) => c.post_id)));
  if (parentIds.length > 0) {
    const { data: parents } = await admin
      .from('community_posts')
      .select('id, community_id')
      .in('id', parentIds);
    const postToCommunity = new Map(
      ((parents ?? []) as { id: string; community_id: string | null }[])
        .filter((p) => p.community_id)
        .map((p) => [p.id, p.community_id as string]),
    );
    for (const row of (comments.data ?? []) as { id: string; post_id: string }[]) {
      const communityId = postToCommunity.get(row.post_id);
      if (communityId) out.set(`community_comment:${row.id}`, communityId);
    }
  }
  // community-level reports map directly.
  for (const row of rows.filter((r) => r.target_type === 'community')) {
    out.set(`community:${row.target_id}`, row.target_id);
  }
  return out;
}

/** Human-readable preview of what a report points at. */
async function describeTargets(
  admin: ReturnType<typeof createAdminClient>,
  rows: ReportRow[],
): Promise<Map<string, string>> {
  const previews = new Map<string, string>();
  const postIds = rows.filter((r) => r.target_type === 'community_post').map((r) => r.target_id);
  const commentIds = rows
    .filter((r) => r.target_type === 'community_comment')
    .map((r) => r.target_id);
  const eventIds = rows.filter((r) => r.target_type === 'community_event').map((r) => r.target_id);
  const communityIds = rows.filter((r) => r.target_type === 'community').map((r) => r.target_id);

  const [posts, comments, events, communities] = await Promise.all([
    postIds.length
      ? admin.from('community_posts').select('id, content').in('id', postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? admin.from('community_comments').select('id, content').in('id', commentIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? admin.from('community_events').select('id, title').in('id', eventIds)
      : Promise.resolve({ data: [] }),
    communityIds.length
      ? admin.from('communities').select('id, name').in('id', communityIds)
      : Promise.resolve({ data: [] }),
  ]);

  for (const row of (posts.data ?? []) as { id: string; content: string }[]) {
    previews.set(`community_post:${row.id}`, row.content);
  }
  for (const row of (comments.data ?? []) as { id: string; content: string }[]) {
    previews.set(`community_comment:${row.id}`, row.content);
  }
  for (const row of (events.data ?? []) as { id: string; title: string }[]) {
    previews.set(`community_event:${row.id}`, row.title);
  }
  for (const row of (communities.data ?? []) as { id: string; name: string }[]) {
    previews.set(`community:${row.id}`, row.name);
  }
  return previews;
}

/**
 * Community reports (spec §Moderation): reported posts, comments, events,
 * polls and communities with resolve / dismiss + optional content removal.
 *
 * Reads from the dedicated `community_reports` table (created in the
 * community redesign migration) rather than the legacy generic `reports`
 * table.
 */
export default async function CommunityReportsPage({
  searchParams,
}: PageProps<'/communities/reports'>) {
  const params = await searchParams;
  const status = ['open', 'reviewing', 'resolved', 'dismissed'].includes(String(params.status))
    ? String(params.status)
    : 'open';
  const reasonParam = String(params.reason ?? '');
  const reason = COMMUNITY_REASONS.includes(reasonParam as CommunityReportReason)
    ? (reasonParam as CommunityReportReason)
    : null;
  const communityId =
    typeof params.community === 'string' && params.community.length > 0
      ? params.community
      : null;
  const page = Math.max(1, Number.parseInt(String(params.page ?? '1'), 10) || 1);

  const admin = createAdminClient();

  // First read the candidate rows. We resolve the community-id filter in a
  // second hop because the table only stores target_type/target_id — we have
  // to look up which row they belong to before filtering.
  let query = admin
    .from('community_reports')
    .select(
      'id, target_type, target_id, reason, details, status, resolution_note, created_at, reporter_id',
      { count: 'exact' },
    )
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (reason) {
    query = query.eq('reason', reason);
  }

  const { data: rows, count, error } = await query;
  const allReports = (rows ?? []) as ReportRow[];

  // Community filter — fetch communities (the user's filter is a name slug
  // that matches both communities directly and communities-of-content).
  let filtered = allReports;
  if (communityId) {
    const communityMap = await resolveCommunityIds(admin, allReports);
    filtered = allReports.filter((r) => {
      const key =
        r.target_type === 'community' ? `community:${r.target_id}` : communityMap.get(`${r.target_type}:${r.target_id}`);
      return key === communityId;
    });
  }

  const total = communityId ? filtered.length : count ?? 0;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const reports = paged;
  const previews = await describeTargets(admin, reports);

  const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));
  const { data: profiles } =
    reporterIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', reporterIds)
      : { data: [] };
  const names = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? 'User',
    ]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = new URLSearchParams();
  baseParams.set('status', status);
  if (reason) baseParams.set('reason', reason);
  if (communityId) baseParams.set('community', communityId);
  const pageHref = (target: number) => {
    const p = new URLSearchParams(baseParams);
    if (target > 1) p.set('page', String(target));
    const qs = p.toString();
    return `/communities/reports${qs ? `?${qs}` : ''}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Community reports
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total} report{total === 1 ? '' : 's'} · resolving can also remove the content.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {(['open', 'reviewing', 'resolved', 'dismissed'] as const).map((value) => (
          <Link
            key={value}
            href={(() => {
              const p = new URLSearchParams();
              p.set('status', value);
              if (reason) p.set('reason', reason);
              if (communityId) p.set('community', communityId);
              const qs = p.toString();
              return `/communities/reports${qs ? `?${qs}` : ''}`;
            })()}
            className={`rounded-lg px-3 py-1.5 font-medium capitalize transition ${
              status === value
                ? 'bg-indigo-600 text-white'
                : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {value}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span>Reason filter:</span>
        <Link
          href={(() => {
            const p = new URLSearchParams();
            p.set('status', status);
            if (communityId) p.set('community', communityId);
            const qs = p.toString();
            return `/communities/reports${qs ? `?${qs}` : ''}`;
          })()}
          className={`rounded-full px-2.5 py-0.5 capitalize ${
            reason === null
              ? 'bg-indigo-100 text-indigo-700'
              : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          any
        </Link>
        {COMMUNITY_REASONS.map((r) => (
          <Link
            key={r}
            href={(() => {
              const p = new URLSearchParams();
              p.set('status', status);
              p.set('reason', r);
              if (communityId) p.set('community', communityId);
              const qs = p.toString();
              return `/communities/reports${qs ? `?${qs}` : ''}`;
            })()}
            className={`rounded-full px-2.5 py-0.5 capitalize ${
              reason === r
                ? 'bg-indigo-100 text-indigo-700'
                : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {r}
          </Link>
        ))}
      </div>

      {communityId && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700">
          Community: <span className="font-mono">{communityId}</span>
          <Link
            href={(() => {
              const p = new URLSearchParams();
              p.set('status', status);
              if (reason) p.set('reason', reason);
              const qs = p.toString();
              return `/communities/reports${qs ? `?${qs}` : ''}`;
            })()}
            className="text-indigo-600 hover:underline"
          >
            clear
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load reports: {error.message}
        </p>
      )}
      {!error && reports.length === 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-600">No {status} reports. 🎉</p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {reports.map((report) => {
          const preview = previews.get(`${report.target_type}:${report.target_id}`);
          return (
            <article
              key={report.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {report.target_type.replace('community_', '')}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILLS[report.status]}`}
                  >
                    {report.status}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {names.get(report.reporter_id) ?? 'User'} · {formatDate(report.created_at)}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-zinc-900">{report.reason}</p>
              {report.details && (
                <p className="mt-1 text-sm text-zinc-500">{report.details}</p>
              )}
              {preview ? (
                <blockquote className="mt-3 border-l-4 border-zinc-200 pl-3 text-sm text-zinc-600">
                  <span className="line-clamp-3">{preview}</span>
                </blockquote>
              ) : (
                <p className="mt-3 text-xs text-zinc-400">
                  (target content no longer available)
                </p>
              )}
              {report.resolution_note && (
                <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  Resolution: {report.resolution_note}
                </p>
              )}

              {(report.status === 'open' || report.status === 'reviewing') && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <ResolveReportForm
                    reportId={report.id}
                    targetType={report.target_type}
                    targetId={report.target_id}
                    canRemoveTarget={REMOVABLE_TARGETS.has(report.target_type)}
                  />
                </div>
              )}
            </article>
          );
        })}
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
