import { createAdminClient } from '@/lib/supabase/admin';

/** Public analytics summary served to the admin dashboard (step 19,
 *  spec §7 Dashboard). All queries run through the service role so the
 *  staff gate + page-level render is the only access check. */

/** Rolling 7-day window; analytics surfaces "recent" activity with this. */
export const RECENT_DAYS = 7;
/** Active opportunity = published AND deadline >= today. */
export const EXPIRY_WINDOW_DAYS = 14;

export interface DashboardKpis {
  // People
  totalUsers: number;
  activeStudents: number;
  newRegistrationsLast7Days: number;
  totalTutors: number;
  // Opportunities
  activeOpportunities: number;
  pendingReviewOpportunities: number;
  expiringOpportunities: number;
  totalEvents: number;
  totalScholarships: number;
  // Housing & services
  activeToletListings: number;
  pendingToletListings: number;
  activeHubListings: number;
  pendingHubListings: number;
  totalMesses: number;
  // Community
  activeCommunities: number;
  communityMemberships: number;
  pendingCommunityRequests: number;
  // Moderation
  openReports: number;
  pendingTuitionRequests: number;
}

export interface RecentRegistration {
  id: string;
  fullName: string | null;
  createdAt: string;
  universityName: string | null;
}

export interface ExpiringOpportunity {
  id: string;
  title: string;
  organizationName: string | null;
  deadline: string;
  daysRemaining: number;
  type: string;
}

export interface RecentNotification {
  title: string;
  body: string;
  type: string;
  createdAt: string;
  recipientCount: number;
}

export interface CommunityActivityItem {
  id: string;
  kind: 'post' | 'request';
  title: string;
  communityName: string | null;
  actorName: string | null;
  createdAt: string;
}

/** One row of the unified "needs attention" queue on the dashboard. */
export interface ModerationItem {
  id: string;
  kind: 'opportunity' | 'tolet' | 'hub' | 'community request' | 'report' | 'tuition request';
  title: string;
  href: string;
  createdAt: string;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  recentRegistrations: RecentRegistration[];
  expiring: ExpiringOpportunity[];
  recentNotifications: RecentNotification[];
  communityActivity: CommunityActivityItem[];
  moderationQueue: ModerationItem[];
  /** ISO timestamp the metrics were computed at. */
  generatedAt: string;
}

function dayStartIso(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysInFutureIso(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

interface CountResult {
  count: number | null;
}

interface ProfileJoinRow {
  id: string;
  full_name: string | null;
  created_at: string;
  university: { name: string } | null;
}

interface ExpiringRow {
  id: string;
  title: string;
  organization_name: string | null;
  deadline: string;
  type: string;
}

interface RecentNotificationRow {
  title: string;
  body: string;
  type: string;
  created_at: string;
  notifications_deliveries: { id: string }[];
}

interface PendingOpportunityRow {
  id: string;
  title: string;
  created_at: string;
}

interface PendingHubRow {
  id: string;
  title: string;
  created_at: string;
}

interface PendingCommunityRequestRow {
  id: string;
  name: string;
  created_at: string;
}

interface PendingTuitionRequestRow {
  id: string;
  created_at: string;
}

interface OpenReportRow {
  id: string;
  target_type: string;
  reason: string;
  created_at: string;
}

/** Build a single-pass analytics summary. Aggregates use head:true where
 *  possible so the platform keeps cheap to render as data grows. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const admin = createAdminClient();
  const since = dayStartIso(RECENT_DAYS);
  const beforeExpiry = todayIso();
  const afterExpiry = daysInFutureIso(EXPIRY_WINDOW_DAYS);

  const [
    totalUsersR,
    activeStudentsR,
    newRegistrationsR,
    totalTutorsR,
    activeOpportunitiesR,
    pendingReviewR,
    expiringOpportunitiesR,
    totalEventsR,
    totalScholarshipsR,
    activeToletR,
    pendingToletR,
    activeHubR,
    pendingHubR,
    totalMessesR,
    activeCommunitiesR,
    pendingCommunityRequestsR,
    openCommunityReportsR,
    openContentReportsR,
    pendingTuitionRequestsR,
    recentProfilesR,
    expiringListR,
    recentNotificationsR,
    activeCommunityMembersR,
    communityPostsR,
    communityRequestsR,
    pendingOpportunityListR,
    pendingToletListR,
    pendingHubListR,
    pendingCommunityRequestListR,
    pendingTuitionRequestListR,
    openReportListR,
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'student'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),
    admin.from('tutors').select('id', { count: 'exact', head: true }),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('deadline', beforeExpiry),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('deadline', beforeExpiry)
      .lte('deadline', afterExpiry),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'event')
      .eq('status', 'published'),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'scholarship')
      .eq('status', 'published'),
    // To-Let listings are `type = 'tolet'` rows on the unified table.
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'tolet')
      .eq('status', 'published'),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'tolet')
      .eq('status', 'pending_review'),
    admin
      .from('student_hub_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    admin
      .from('student_hub_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    admin.from('messes').select('id', { count: 'exact', head: true }),
    admin
      .from('communities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('community_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('community_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    // Content reports (to-let + hub listings) share the `reports` table.
    admin
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    admin
      .from('tuition_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('profiles')
      .select('id, full_name, created_at, university:universities(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('opportunities')
      .select('id, title, organization_name, deadline, type')
      .eq('status', 'published')
      .gte('deadline', beforeExpiry)
      .lte('deadline', afterExpiry)
      .order('deadline', { ascending: true })
      .limit(10),
    admin
      .from('notifications')
      .select(
        'title, body, type, created_at, ' +
          'notifications_deliveries:notification_deliveries(id)',
      )
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      // Sum of memberships across active communities. RLS-free via the
      // service-role client. (community_members.last_active_at is not
      // populated yet, so we report memberships rather than "active in
      // the last 30 days".)
      .from('community_members')
      .select('community:communities!inner(id)', { count: 'exact', head: true })
      .eq('community.status', 'active'),
    admin
      .from('community_posts')
      .select(
        'id, content, post_type, created_at, author_id, community:communities(name)',
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('community_requests')
      .select('id, name, created_at, requested_by')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('opportunities')
      .select('id, title, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('opportunities')
      .select('id, title, created_at')
      .eq('type', 'tolet')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('student_hub_listings')
      .select('id, title, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('community_requests')
      .select('id, name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('tuition_requests')
      .select('id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('reports')
      .select('id, target_type, reason, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const count = (r: unknown): number => (r as unknown as CountResult).count ?? 0;

  const expiringList: ExpiringOpportunity[] = ((expiringListR.data ?? []) as unknown as ExpiringRow[])
    .map((row) => {
      const ms = new Date(row.deadline).getTime() - Date.now();
      const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
      return {
        id: row.id,
        title: row.title,
        organizationName: row.organization_name,
        deadline: row.deadline,
        daysRemaining: days,
        type: row.type,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const recentRegistrations: RecentRegistration[] = (
    (recentProfilesR.data ?? []) as unknown as ProfileJoinRow[]
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    createdAt: row.created_at,
    universityName: row.university?.name ?? null,
  }));

  const recentNotifications: RecentNotification[] = (
    (recentNotificationsR.data ?? []) as unknown as RecentNotificationRow[]
  ).map((row) => ({
    title: row.title,
    body: row.body,
    type: row.type,
    createdAt: row.created_at,
    recipientCount: row.notifications_deliveries?.length ?? 0,
  }));

  interface CommunityPostActivityRow {
    id: string;
    content: string;
    post_type: string;
    created_at: string;
    author_id: string;
    community: { name: string } | null;
  }

  interface CommunityRequestActivityRow {
    id: string;
    name: string;
    created_at: string;
    requested_by: string;
  }

  const activityActorIds = Array.from(
    new Set([
      ...((communityPostsR.data ?? []) as unknown as CommunityPostActivityRow[]).map(
        (row) => row.author_id,
      ),
      ...((communityRequestsR.data ?? []) as unknown as CommunityRequestActivityRow[]).map(
        (row) => row.requested_by,
      ),
    ]),
  );
  const { data: activityProfiles } =
    activityActorIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', activityActorIds)
      : { data: [] };
  const activityNames = new Map(
    ((activityProfiles ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? 'User',
    ]),
  );

  const communityActivity: CommunityActivityItem[] = [
    ...((communityPostsR.data ?? []) as unknown as CommunityPostActivityRow[]).map((row) => ({
      id: row.id,
      kind: 'post' as const,
      title: row.content.split('\n')[0].slice(0, 80),
      communityName: row.community?.name ?? null,
      actorName: activityNames.get(row.author_id) ?? null,
      createdAt: row.created_at,
    })),
    ...((communityRequestsR.data ?? []) as unknown as CommunityRequestActivityRow[]).map(
      (row) => ({
        id: row.id,
        kind: 'request' as const,
        title: `Community request: ${row.name}`,
        communityName: null,
        actorName: activityNames.get(row.requested_by) ?? null,
        createdAt: row.created_at,
      }),
    ),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Unified moderation queue: everything waiting on a staff decision,
  // newest first, capped so the panel stays scannable.
  const moderationQueue: ModerationItem[] = [
    ...((pendingOpportunityListR.data ?? []) as unknown as PendingOpportunityRow[])
      .filter((row) => row.title)
      .map((row) => ({
        id: row.id,
        kind: 'opportunity' as const,
        title: row.title,
        href: `/opportunities/${row.id}`,
        createdAt: row.created_at,
      })),
    ...((pendingToletListR.data ?? []) as unknown as PendingOpportunityRow[])
      .filter((row) => row.title)
      .map((row) => ({
        id: row.id,
        kind: 'tolet' as const,
        title: row.title,
        href: `/tolet/${row.id}`,
        createdAt: row.created_at,
      })),
    ...((pendingHubListR.data ?? []) as unknown as PendingHubRow[]).map((row) => ({
      id: row.id,
      kind: 'hub' as const,
      title: row.title,
      href: `/hub/${row.id}`,
      createdAt: row.created_at,
    })),
    ...((pendingCommunityRequestListR.data ?? []) as unknown as PendingCommunityRequestRow[]).map(
      (row) => ({
        id: row.id,
        kind: 'community request' as const,
        title: row.name,
        href: '/communities/pending',
        createdAt: row.created_at,
      }),
    ),
    ...((pendingTuitionRequestListR.data ?? []) as unknown as PendingTuitionRequestRow[]).map(
      (row) => ({
        id: row.id,
        kind: 'tuition request' as const,
        title: 'Tuition request awaiting review',
        href: '/tuition/requests',
        createdAt: row.created_at,
      }),
    ),
    ...((openReportListR.data ?? []) as unknown as OpenReportRow[]).map((row) => ({
      id: row.id,
      kind: 'report' as const,
      title: `${row.target_type} — ${row.reason}`,
      href: row.target_type === 'hub_listing' ? '/hub/reports' : '/tolet/reports',
      createdAt: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

  const summary: DashboardSummary = {
    kpis: {
      totalUsers: count(totalUsersR),
      activeStudents: count(activeStudentsR),
      newRegistrationsLast7Days: count(newRegistrationsR),
      totalTutors: count(totalTutorsR),
      activeOpportunities: count(activeOpportunitiesR),
      pendingReviewOpportunities: count(pendingReviewR),
      expiringOpportunities: count(expiringOpportunitiesR),
      totalEvents: count(totalEventsR),
      totalScholarships: count(totalScholarshipsR),
      activeToletListings: count(activeToletR),
      pendingToletListings: count(pendingToletR),
      activeHubListings: count(activeHubR),
      pendingHubListings: count(pendingHubR),
      totalMesses: count(totalMessesR),
      activeCommunities: count(activeCommunitiesR),
      communityMemberships: count(activeCommunityMembersR),
      pendingCommunityRequests: count(pendingCommunityRequestsR),
      openReports: count(openCommunityReportsR) + count(openContentReportsR),
      pendingTuitionRequests: count(pendingTuitionRequestsR),
    },
    recentRegistrations,
    expiring: expiringList,
    recentNotifications,
    communityActivity,
    moderationQueue,
    generatedAt: new Date().toISOString(),
  };

  void admin;
  return summary;
}
