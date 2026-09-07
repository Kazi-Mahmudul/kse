import Link from 'next/link';

import { formatDate, formatDateTime } from '@/lib/format';
import {
  EXPIRY_WINDOW_DAYS,
  RECENT_DAYS,
  getDashboardSummary,
  type DashboardKpis,
  type ExpiringOpportunity,
} from '@/features/analytics/queries';

/**
 * Admin dashboard (spec §7 "Admin Panel" → Dashboard + step 19 Analytics).
 * Renders the platform overview tiles and recent activity pulled through
 * the service-role client (spec §10: only trusted server contexts cross
 * RLS for cross-user aggregates).
 */

interface KpiSpec {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'warning' | 'success';
}

function buildKpis(kpis: DashboardKpis): KpiSpec[] {
  return [
    { label: 'Total users', value: kpis.totalUsers },
    {
      label: 'Active students',
      value: kpis.activeStudents,
      hint: 'role = student',
    },
    {
      label: `New registrations (last ${RECENT_DAYS}d)`,
      value: kpis.newRegistrationsLast7Days,
      tone: 'success',
    },
    {
      label: 'Active opportunities',
      value: kpis.activeOpportunities,
      hint: 'published & upcoming',
    },
    {
      label: `Expiring (next ${EXPIRY_WINDOW_DAYS}d)`,
      value: kpis.expiringOpportunities,
      tone: kpis.expiringOpportunities > 0 ? 'warning' : 'default',
    },
    { label: 'Tutors', value: kpis.totalTutors },
    { label: 'Events', value: kpis.totalEvents },
    { label: 'Communities', value: kpis.totalCommunities },
    {
      label: 'Pending review',
      value: kpis.pendingReviewOpportunities,
      tone: kpis.pendingReviewOpportunities > 0 ? 'warning' : 'default',
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <span className={`size-2 rounded-full ${TONE_DOT[kpi.tone ?? 'default']}`} />
        {kpi.label}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900">
        {kpi.value.toLocaleString()}
      </p>
      {kpi.hint && (
        <p className="mt-1 text-xs text-zinc-400">{kpi.hint}</p>
      )}
    </div>
  );
}

function daysLabel(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const kpiTiles = buildKpis(summary.kpis);
  const expiringLimited = summary.expiring.slice(0, 8);
  const totalExpiring = summary.expiring.length;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Platform dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Cross-tenant overview of users, content and engagement. Generated{' '}
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

      <section className="mt-6">
        <h2 className="sr-only">Key metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kpiTiles.map((kpi) => (
            <KpiTile key={kpi.label} kpi={kpi} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent registrations */}
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Recent registrations
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Newest profiles (any role)
              </p>
            </div>
            <Link href="/users" className="text-xs font-medium text-indigo-600 hover:underline">
              All users →
            </Link>
          </header>
          {summary.recentRegistrations.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">
              No registrations yet.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.recentRegistrations.map((profile) => (
                <li key={profile.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {profile.fullName?.trim() || profile.email || profile.id.slice(0, 8)}
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
        </div>

        {/* Expiring opportunities */}
        <div className="rounded-2xl border border-zinc-200 bg-white lg:col-span-2">
          <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Expiring opportunities
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {totalExpiring} published {totalExpiring === 1 ? 'item' : 'items'} with a deadline within{' '}
                {EXPIRY_WINDOW_DAYS} days. Show the first {expiringLimited.length}.
              </p>
            </div>
            <Link href="/opportunities" className="text-xs font-medium text-indigo-600 hover:underline">
              Manage →
            </Link>
          </header>
          {expiringLimited.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">
              Nothing is expiring soon — the platform has fresh content.
            </p>
          ) : (
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
          )}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Recent announcements
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Latest 5 notifications published by staff.
              </p>
            </div>
            <Link href="/notifications" className="text-xs font-medium text-indigo-600 hover:underline">
              Compose →
            </Link>
          </header>
          {summary.recentNotifications.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-500">
              No announcements sent yet. Use the composer on the Notifications
              page to send the first one.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.recentNotifications.map((notification, idx) => (
                <li key={`${notification.title}-${notification.createdAt}-${idx}`} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {notification.body}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">
                    {notification.type} · {notification.recipientCount}{' '}
                    {notification.recipientCount === 1 ? 'recipient' : 'recipients'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Notes for staff</h2>
          <ul className="mt-3 space-y-2 text-xs text-zinc-500">
            <li>
              <strong className="font-medium text-zinc-700">Tutors</strong> flip to verified via the Tuition page.
            </li>
            <li>
              <strong className="font-medium text-zinc-700">Communities</strong> can be hidden or restored at Communities → detail.
            </li>
            <li>
              <strong className="font-medium text-zinc-700">Pending review</strong> opportunities require manual moderation.
            </li>
            <li>
              Aggregate metrics render through the service role, so the staff
              session in the layout is the only access gate.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
