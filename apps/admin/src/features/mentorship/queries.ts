/**
 * Admin mentorship data-access layer.
 * All queries use the service-role client; access is gated at the page layout.
 */
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminMentorRow {
  id: string;
  title: string;
  organization_name: string;
  status: string;
  experience_years: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  education: string | null;
  opportunity_mode: string | null;
  featured: boolean;
  verified: boolean;
  updated_at: string;
  published_at: string | null;
}

export interface AdminSessionRow {
  id: string;
  opportunity_id: string;
  student_id: string;
  topic: string;
  message: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  session_mode: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  request_type: string;
  status: string;
  created_at: string;
  mentor_title: string | null;
  student_full_name: string | null;
  student_email: string | null;
}

export interface AdminQuestionRow {
  id: string;
  student_id: string;
  question: string;
  category: string;
  status: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  student_full_name: string | null;
  student_email: string | null;
}

export interface AdminDiscussionRow {
  id: string;
  opportunity_id: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  mentor_title: string | null;
}

export interface MentorshipKpis {
  totalMentors: number;
  publishedMentors: number;
  pendingSessionRequests: number;
  confirmedSessions: number;
  openQuestions: number;
  answeredQuestions: number;
  totalDiscussions: number;
}

const PAGE_SIZE = 25;

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getMentorshipKpis(): Promise<MentorshipKpis> {
  const admin = createAdminClient();

  const [
    totalRes,
    publishedRes,
    pendingSessionsRes,
    confirmedSessionsRes,
    openQuestionsRes,
    answeredQuestionsRes,
    discussionsRes,
  ] = await Promise.all([
    admin.from('opportunities').select('id', { count: 'exact', head: true }).eq('type', 'mentorship'),
    admin.from('opportunities').select('id', { count: 'exact', head: true }).eq('type', 'mentorship').eq('status', 'published'),
    admin.from('mentorship_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('mentorship_requests').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'confirmed']),
    admin.from('mentor_questions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('mentor_questions').select('id', { count: 'exact', head: true }).eq('status', 'answered'),
    admin.from('mentor_discussions').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalMentors: totalRes.count ?? 0,
    publishedMentors: publishedRes.count ?? 0,
    pendingSessionRequests: pendingSessionsRes.count ?? 0,
    confirmedSessions: confirmedSessionsRes.count ?? 0,
    openQuestions: openQuestionsRes.count ?? 0,
    answeredQuestions: answeredQuestionsRes.count ?? 0,
    totalDiscussions: discussionsRes.count ?? 0,
  };
}

// ─── Mentors list ─────────────────────────────────────────────────────────────

export async function getMentors(opts: {
  q?: string;
  status?: string;
  page?: number;
}): Promise<{ rows: AdminMentorRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);

  let query = admin
    .from('opportunities')
    .select(
      'id, title, organization_name, status, experience_years, rating_avg, rating_count, education, opportunity_mode, featured, verified, updated_at, published_at',
      { count: 'exact' },
    )
    .eq('type', 'mentorship')
    .order('updated_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.q) {
    const sanitized = opts.q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,organization_name.ilike.%${sanitized}%`);
    }
  }

  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;

  return { rows: (data ?? []) as AdminMentorRow[], total: count ?? 0 };
}

// ─── Session requests ─────────────────────────────────────────────────────────

export async function getSessionRequests(opts: {
  status?: string;
  page?: number;
}): Promise<{ rows: AdminSessionRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);

  let query = admin
    .from('mentorship_requests')
    .select(
      `id, opportunity_id, student_id, topic, message, preferred_date, preferred_time,
       session_mode, contact_email, contact_phone, request_type, status, created_at,
       opportunities ( title )`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (opts.status) {
    if (opts.status === 'confirmed' || opts.status === 'accepted') {
      query = query.in('status', ['accepted', 'confirmed']);
    } else if (opts.status === 'completed' || opts.status === 'closed') {
      query = query.in('status', ['closed', 'completed']);
    } else if (opts.status === 'cancelled' || opts.status === 'rejected') {
      query = query.in('status', ['rejected', 'cancelled']);
    } else {
      query = query.eq('status', opts.status);
    }
  }

  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;

  const studentIds = Array.from(new Set((data ?? []).map((r: any) => r.student_id).filter(Boolean)));
  const profilesMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: profileRows } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
    (profileRows ?? []).forEach((p: any) => {
      if (p.full_name) profilesMap.set(p.id, p.full_name);
    });
  }

  const rows: AdminSessionRow[] = (data ?? []).map((row: any) => {
    let normalizedStatus = row.status;
    if (row.status === 'accepted') normalizedStatus = 'confirmed';
    else if (row.status === 'closed') normalizedStatus = 'completed';
    else if (row.status === 'rejected') normalizedStatus = 'cancelled';

    return {
      id: row.id,
      opportunity_id: row.opportunity_id,
      student_id: row.student_id,
      topic: row.topic,
      message: row.message,
      preferred_date: row.preferred_date,
      preferred_time: row.preferred_time,
      session_mode: row.session_mode,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      request_type: row.request_type,
      status: normalizedStatus,
      created_at: row.created_at,
      mentor_title: row.opportunities?.title ?? null,
      student_full_name: profilesMap.get(row.student_id) ?? null,
      student_email: row.contact_email ?? null,
    };
  });

  return { rows, total: count ?? 0 };
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getMentorQuestions(opts: {
  status?: string;
  page?: number;
}): Promise<{ rows: AdminQuestionRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);

  let query = admin
    .from('mentor_questions')
    .select(
      'id, student_id, question, category, status, answer, answered_by, answered_at, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (opts.status) query = query.eq('status', opts.status);

  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;

  const studentIds = Array.from(new Set((data ?? []).map((r: any) => r.student_id).filter(Boolean)));
  const profilesMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: profileRows } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
    (profileRows ?? []).forEach((p: any) => {
      if (p.full_name) profilesMap.set(p.id, p.full_name);
    });
  }

  const rows: AdminQuestionRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    question: row.question,
    category: row.category,
    status: row.status,
    answer: row.answer,
    answered_by: row.answered_by,
    answered_at: row.answered_at,
    created_at: row.created_at,
    student_full_name: profilesMap.get(row.student_id) ?? null,
    student_email: null,
  }));

  return { rows, total: count ?? 0 };
}

// ─── Discussions ──────────────────────────────────────────────────────────────

export async function getMentorDiscussions(opts: {
  page?: number;
}): Promise<{ rows: AdminDiscussionRow[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);

  const { data, count, error } = await admin
    .from('mentor_discussions')
    .select(
      `id, opportunity_id, title, content, likes_count, comments_count, created_at,
       opportunities ( title )`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) throw error;

  const rows: AdminDiscussionRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    opportunity_id: row.opportunity_id,
    title: row.title,
    content: row.content,
    likes_count: row.likes_count ?? 0,
    comments_count: row.comments_count ?? 0,
    created_at: row.created_at,
    mentor_title: row.opportunities?.title ?? null,
  }));

  return { rows, total: count ?? 0 };
}

export async function getMentorDetail(id: string): Promise<AdminMentorDetail | null> {
  const admin = createAdminClient();

  const [oppRes, sessionsRes, discussionsRes, tagsRes] = await Promise.all([
    admin.from('opportunities').select('*').eq('id', id).eq('type', 'mentorship').maybeSingle(),
    admin
      .from('mentorship_requests')
      .select(
        `id, opportunity_id, student_id, topic, message, preferred_date, preferred_time,
         session_mode, contact_email, contact_phone, request_type, status, created_at`,
      )
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('mentor_discussions')
      .select('id, opportunity_id, title, content, likes_count, comments_count, created_at')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('opportunity_tags')
      .select('tags ( name )')
      .eq('opportunity_id', id),
  ]);

  if (!oppRes.data) return null;

  const row = oppRes.data;
  const tags: string[] = (tagsRes.data ?? [])
    .map((t: any) => t.tags?.name)
    .filter(Boolean);

  const sessionStudentIds = Array.from(
    new Set((sessionsRes.data ?? []).map((s: any) => s.student_id).filter(Boolean)),
  );
  const profilesMap = new Map<string, string>();
  if (sessionStudentIds.length > 0) {
    const { data: profileRows } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', sessionStudentIds);
    (profileRows ?? []).forEach((p: any) => {
      if (p.full_name) profilesMap.set(p.id, p.full_name);
    });
  }

  const sessions: AdminSessionRow[] = (sessionsRes.data ?? []).map((s: any) => ({
    id: s.id,
    opportunity_id: s.opportunity_id,
    student_id: s.student_id,
    topic: s.topic,
    message: s.message,
    preferred_date: s.preferred_date,
    preferred_time: s.preferred_time,
    session_mode: s.session_mode,
    contact_email: s.contact_email,
    contact_phone: s.contact_phone,
    request_type: s.request_type,
    status: s.status,
    created_at: s.created_at,
    mentor_title: row.title,
    student_full_name: profilesMap.get(s.student_id) ?? null,
    student_email: s.contact_email ?? null,
  }));

  const discussions: AdminDiscussionRow[] = (discussionsRes.data ?? []).map((d: any) => ({
    id: d.id,
    opportunity_id: d.opportunity_id,
    title: d.title,
    content: d.content,
    likes_count: d.likes_count ?? 0,
    comments_count: d.comments_count ?? 0,
    created_at: d.created_at,
    mentor_title: row.title,
  }));

  return {
    id: row.id,
    title: row.title,
    organization_name: row.organization_name,
    status: row.status,
    summary: row.summary,
    description: row.description,
    experience_years: row.experience_years,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
    education: row.education,
    opportunity_mode: row.opportunity_mode,
    location: row.location,
    source_url: row.source_url,
    image_url: row.image_url ?? null,
    featured: row.featured,
    verified: row.verified,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    tags,
    sessions,
    discussions,
  };
}

export interface AdminMentorDetail {
  id: string;
  title: string;
  organization_name: string;
  status: string;
  summary: string | null;
  description: string | null;
  experience_years: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  education: string | null;
  opportunity_mode: string | null;
  location: string | null;
  source_url: string | null;
  image_url: string | null;
  featured: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  tags: string[];
  sessions: AdminSessionRow[];
  discussions: AdminDiscussionRow[];
}

export async function getMentorsDropdown(): Promise<
  { id: string; title: string; organization_name: string }[]
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('opportunities')
    .select('id, title, organization_name')
    .eq('type', 'mentorship')
    .order('title', { ascending: true });
  return (data ?? []) as { id: string; title: string; organization_name: string }[];
}

export async function getMentorshipCategories(): Promise<
  { id: string; name: string }[]
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('opportunity_categories')
    .select('id, name')
    .eq('opportunity_type', 'mentorship')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

export { PAGE_SIZE };
