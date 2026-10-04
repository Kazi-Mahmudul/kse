import Link from 'next/link';

import { formatDate, formatDateTime } from '@/lib/format';
import {
  EXPIRY_WINDOW_DAYS,
  RECENT_DAYS,
  getDashboardSummary,
  type DashboardKpis,
  type ExpiringOpportunity,
  type ModerationItem,
} from '@/features/analytics/queries';

/**
 * Admin dashboard (spec §7 "Admin Panel" → Dashboard + step 19 Analytics).
 * Everything renders from live aggregates pulled through the service-role
 * client (spec §10: only trusted server contexts cross RLS for cross-user
 * aggregates). Tiles link straight into the section they describe.
 */

interface KpiSpec {
  label: string;
  value: number;
  href: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'success';
}

function buildKpiGroups(kpis: DashboardKpis) {
  return [
    {
      title: 'People',
      tiles: [
        { label: 'Total users', value: kpis.totalUsers, href: '/users' },
        {
          label: 'Students',
          value: kpis.activeStudents,
          href: '/users',
          hint: 'role = student',
        },
        {
          label: `New registrations (${RECENT_DAYS}d)`,
          value: kpis.newRegistrationsLast7Days,
          href: '/users',
          tone: 'success' as const,
        },
        { label: 'Tutors', value: kpis.totalTutors, href: '/tuition' },
      ],
    },
    {
      title: 'Opportunities',
      tiles: [
        {
          label: 'Live now',
          value: kpis.activeOpportunities,
          href: '/opportunities',
          hint: 'published & not expired',
        },
        {
          label: 'Pending review',
          value: kpis.pendingReviewOpportunities,
          href: '/opportunities?status=pending_review',
          tone: kpis.pendingReviewOpportunities > 0 ? ('warning' as const) : ('default' as const),
        },
        {
          label: `Expiring (${EXPIRY_WINDOW_DAYS}d)`,
          value: kpis.expiringOpportunities,
          href: '/opportunities',
          tone: kpis.expiringOpportunities > 0 ? ('warning' as const) : ('default' as const),
        },
        { label: 'Scholarships', value: kpis.totalScholarships, href: '/opportunities?type=scholarship' },
        { label: 'Events', value: kpis.totalEvents, href: '/opportunities?type=event' },
      ],
    },
    {
      title: 'Housing & services',
      tiles: [
        {
          label: 'To-Let listings',
          value: kpis.activeToletListings,
          href: '/tolet',
          hint:
            kpis.pendingToletListings > 0 ? `${kpis.pendingToletListings} pending review` : 'live',
          tone: kpis.pendingToletListings > 0 ? ('warning' as const) : ('default' as const),
        },
        {
          label: 'Student Hub listings',
          value: kpis.activeHubListings,
          href: '/hub',
          hint: kpis.pendingHubListings > 0 ? `${kpis.pendingHubListings} pending review` : 'live',
          tone: kpis.pendingHubListings > 0 ? ('warning' as const) : ('default' as const),
        },
        { label: 'Messes', value: kpis.totalMesses, href: '/mess' },
      ],
    },
    {
      title: 'Community',
      tiles: [
        { label: 'Active communities', value: kpis.activeCommunities, href: '/communities' },
        {
          label: 'Memberships',
          value: kpis.communityMemberships,
          href: '/communities/members',
          hint: 'across active communities',
        },
        {
          label: 'Community requests',
          value: kpis.pendingCommunityRequests,
          href: '/communities/pending',
          tone: kpis.pendingCommunityRequests > 0 ? ('warning' as const) : ('default' as const),
          hint: 'pending review',
        },
      ],
    },
    {
      title: 'Moderation',
      tiles: [
        {
          label: 'Open reports',
          value: kpis.openReports,
          href: '/communities/reports',
          tone: kpis.openReports > 0 ? ('warning' as const) : ('default' as const),
          hint: 'content + community',
        },
        {
          label: 'Tuition requests',
          value: kpis.pendingTuitionRequests,
          href: '/tuition/requests',
          tone: kpis.pendingTuitionRequests > 0 ? ('warning' as const) : ('default' as const),
          hint: 'pending review',
        },
      ],
    },
  ];
}

const TONE_DOT: Record<NonNullable<KpiSpec['tone']>, string> = {
  default: 'bg-zinc-300',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
};

function KpiTile({ kpi }: { kpi: KpiSpec }) {
  return (
    <Link
      href={kpi.href}
      className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <span className={`size-2 rounded-full ${TONE_DOT[kpi.tone ?? 'default']}`} />
        {kpi.label}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 group-hover:text-indigo-700">
        {kpi.value.toLocaleString()}
      </p>
      {kpi.hint && <p className="mt-1 text-xs text-zinc-400">{kpi.hint}</p>}
    </Link>
  );
}

function Panel({
  title,
  description,
  actionHref,
  actionLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white ${className ?? ''}`}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
        {actionHref && (
          <Link
            href={actionHref}
            className="shrink-0 text-xs font-medium text-indigo-600 hover:underline"
          >
            {actionLabel} →
          </Link>
        )}
      </header>
      {children}
    </div>
  );
}

function daysLabel(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

const MODERATION_TONE: Record<ModerationItem['kind'], string> = {
  opportunity: 'bg-indigo-50 text-indigo-700',
  tolet: 'bg-cyan-50 text-cyan-700',
  hub: 'bg-violet-50 text-violet-700',
  'community request': 'bg-amber-50 text-amber-700',
  report: 'bg-red-50 text-red-700',
  'tuition request': 'bg-emerald-50 text-emerald-700',
};

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const kpiGroups = buildKpiGroups(summary.kpis);
  const expiringLimited = summary.expiring.slice(0, 8);
  const totalExpiring = summary.expiring.length;

  return (
    <div>
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Platform dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Live overview of users, content and engagement. Generated{' '}
              {formatDateTime(summary.generatedAt)}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/opportunities?status=pending_review"
              className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              Review queue ({summary.kpis.pendingReviewOpportunities})
            </Link>
            <Link
              href="/notifications"
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Send announcement
            </Link>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      {summary.moderationQueue.length > 0 && (
        <Panel
          title={`Needs attention (${summary.moderationQueue.length})`}
          description="Newest first — pending reviews, requests and open reports across every module."
          className="mt-6 border-amber-200 bg-amber-50/40"
        >
          <ul className="divide-y divide-zinc-100">
            {summary.moderationQueue.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="px-5 py-3">
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 transition hover:bg-white/70"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${MODERATION_TONE[item.kind]}`}
                    >
                      {item.kind}
                    </span>
                    <span className="truncate text-sm font-medium text-zinc-900">
                      {item.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* KPI groups */}
      {kpiGroups.map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {group.title}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {group.tiles.map((kpi) => (
              <KpiTile key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </section>
      ))}

      {/* Registrations + expiring */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Recent registrations"
          description="Newest profiles (any role)"
          actionHref="/users"
          actionLabel="All users"
        >
          {summary.recentRegistrations.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">No registrations yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.recentRegistrations.map((profile) => (
                <li
                  key={profile.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {profile.fullName?.trim() || 'Unnamed user'}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {profile.universityName ?? '—'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(profile.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Expiring opportunities"
          description={`${totalExpiring} published ${
            totalExpiring === 1 ? 'item' : 'items'
          } with a deadline within ${EXPIRY_WINDOW_DAYS} days. Show the first ${
            expiringLimited.length
          }.`}
          actionHref="/opportunities"
          actionLabel="Manage"
          className="lg:col-span-2"
        >
          {expiringLimited.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">
              Nothing is expiring soon — the platform has fresh content.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-5 py-2 text-right font-medium">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringLimited.map((opportunity: ExpiringOpportunity) => (
                    <tr key={opportunity.id} className="border-t border-zinc-100">
                      <td className="px-5 py-3">
                        <Link
                          href={`/opportunities/${opportunity.id}`}
                          className="font-medium text-zinc-900 hover:text-indigo-600"
                        >
                          {opportunity.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs uppercase tracking-wide text-zinc-500">
                        {opportunity.type}
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        {opportunity.organizationName ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={
                            opportunity.daysRemaining <= 2
                              ? 'inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700'
                              : opportunity.daysRemaining <= 5
                                ? 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700'
                                : 'inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600'
                          }
                        >
                          {daysLabel(opportunity.daysRemaining)} · {formatDate(opportunity.deadline)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      {/* Community activity */}
      <section className="mt-6">
        <Panel
          title="Community activity"
          description="Latest posts and community requests across the platform."
          actionHref="/communities/moderation"
          actionLabel="Moderation"
        >
          {summary.communityActivity.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">No community activity yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.communityActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      <span
                        className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.kind === 'request'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {item.kind}
                      </span>
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {item.actorName ?? 'User'}
                      {item.communityName ? ` · ${item.communityName}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* Announcements + staff notes */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Recent announcements"
          description="Latest 5 notifications published by staff."
          actionHref="/notifications"
          actionLabel="Compose"
        >
          {summary.recentNotifications.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">
              No announcements sent yet. Use the composer on the Notifications page to send the
              first one.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.recentNotifications.map((notification, idx) => (
                <li
                  key={`${notification.title}-${notification.createdAt}-${idx}`}
                  className="px-5 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{notification.body}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">
                    {notification.type} · {notification.recipientCount}{' '}
                    {notification.recipientCount === 1 ? 'recipient' : 'recipients'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Notes for staff</h2>
          <ul className="mt-3 space-y-2 text-xs text-zinc-500">
            <li>
              <strong className="font-medium text-zinc-700">Tutors</strong> flip to verified via
              the Tuition page.
            </li>
            <li>
              <strong className="font-medium text-zinc-700">Communities</strong> can be hidden or
              restored at Communities → detail.
            </li>
            <li>
              <strong className="font-medium text-zinc-700">Pending review</strong> opportunities
              require manual moderation.
            </li>
            <li>
              Reference rows (skills, subjects, categories) are managed inside their owning
              section — no separate master-data page.
            </li>
            <li>
              Aggregate metrics render through the service role, so the staff session in the
              layout is the only access gate.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
