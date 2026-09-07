import { createAdminClient } from '@/lib/supabase/admin';

/** Public analytics summary served to the admin dashboard (step 19,
 *  spec §7 Dashboard). All queries run through the service role so the
 *  staff gate + page-level render is the only access check. */

/** Rolling 7-day window; analytics surfaces "recent" activity with this. */
export const RECENT_DAYS = 7;
/** Active opportunity = published AND deadline >= today. */
export const EXPIRY_WINDOW_DAYS = 14;

export interface DashboardKpis {
  totalUsers: number;
  activeStudents: number;
  newRegistrationsLast7Days: number;
  activeOpportunities: number;
  expiringOpportunities: number;
  totalTutors: number;
  totalEvents: number;
  totalCommunities: number;
  pendingReviewOpportunities: number;
}

export interface RecentRegistration {
  id: string;
  fullName: string | null;
  email: string | null;
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

export interface DashboardSummary {
  kpis: DashboardKpis;
  recentRegistrations: RecentRegistration[];
  expiring: ExpiringOpportunity[];
  recentNotifications: RecentNotification[];
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
  email: string | null;
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
    activeOpportunitiesR,
    expiringOpportunitiesR,
    totalTutorsR,
    totalEventsR,
    totalCommunitiesR,
    pendingReviewR,
    recentProfilesR,
    expiringListR,
    recentNotificationsR,
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
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('deadline', beforeExpiry),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('deadline', beforeExpiry)
      .lte('deadline', afterExpiry),
    admin.from('tutors').select('id', { count: 'exact', head: true }),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'event'),
    admin.from('communities').select('id', { count: 'exact', head: true }),
    admin
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    admin
      .from('profiles')
      .select('id, full_name, email, created_at, university:universities(name)')
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
  ]);

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
    email: row.email,
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

  const summary: DashboardSummary = {
    kpis: {
      totalUsers: (totalUsersR as unknown as CountResult).count ?? 0,
      activeStudents: (activeStudentsR as unknown as CountResult).count ?? 0,
      newRegistrationsLast7Days: (newRegistrationsR as unknown as CountResult).count ?? 0,
      activeOpportunities: (activeOpportunitiesR as unknown as CountResult).count ?? 0,
      expiringOpportunities: (expiringOpportunitiesR as unknown as CountResult).count ?? 0,
      totalTutors: (totalTutorsR as unknown as CountResult).count ?? 0,
      totalEvents: (totalEventsR as unknown as CountResult).count ?? 0,
      totalCommunities: (totalCommunitiesR as unknown as CountResult).count ?? 0,
      pendingReviewOpportunities: (pendingReviewR as unknown as CountResult).count ?? 0,
    },
    recentRegistrations,
    expiring: expiringList,
    recentNotifications,
    generatedAt: new Date().toISOString(),
  };

  void admin;
  return summary;
}
