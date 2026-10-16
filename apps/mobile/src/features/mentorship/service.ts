import { supabase } from '@/lib/supabase';
import type {
  BookSessionPayload,
  CreateDiscussionPayload,
  MentorApplication,
  MentorConversationSummary,
  MentorDetail,
  MentorDiscussion,
  MentorDiscussionComment,
  MentorFilters,
  MentorMessage,
  MentorQuestion,
  MentorSession,
  MentorSummary,
  SubmitMentorApplicationPayload,
  SubmitQuestionPayload,
  UpdateDiscussionPayload,
  UpdateMentorProfilePayload,
} from './types';
import { findMentorCategory } from './categories';

export class MentorshipError extends Error {}

function fail(context: string, message: string): never {
  throw new MentorshipError(`${context}: ${message}`);
}

const MENTOR_SELECT = `
  id,
  type,
  title,
  organization_name,
  summary,
  image_url,
  cover_image_url,
  location,
  opportunity_mode,
  deadline,
  deadline_note,
  featured,
  verified,
  status,
  category_id,
  published_at,
  rating_avg,
  rating_count,
  experience_years,
  education,
  opportunity_tags (
    tags (
      name
    )
  )
`;

interface RawMentorRow {
  id: string;
  type: string;
  title: string;
  organization_name: string;
  summary: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  opportunity_mode: string | null;
  deadline: string | null;
  deadline_note: string | null;
  featured: boolean;
  verified: boolean;
  status: string;
  category_id: string | null;
  published_at: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  experience_years: number | null;
  education: string | null;
  opportunity_tags?: { tags: { name: string } | null }[] | null;
}

function parseTags(row: RawMentorRow): string[] {
  if (!row.opportunity_tags || !Array.isArray(row.opportunity_tags)) return [];
  return row.opportunity_tags
    .map((item) => item.tags?.name)
    .filter((name): name is string => Boolean(name));
}

function formatMentorSummary(row: RawMentorRow): MentorSummary {
  const tags = parseTags(row);
  return {
    id: row.id,
    type: 'mentorship',
    title: row.title,
    organization_name: row.organization_name,
    summary: row.summary,
    image_url: row.image_url,
    cover_image_url: row.cover_image_url ?? null,
    location: row.location,
    opportunity_mode: (row.opportunity_mode as MentorSummary['opportunity_mode']) ?? null,
    deadline: row.deadline,
    deadline_note: row.deadline_note,
    featured: Boolean(row.featured),
    verified: Boolean(row.verified),
    status: row.status as MentorSummary['status'],
    category_id: row.category_id,
    rating_avg: Number(row.rating_avg) || 4.8,
    rating_count: Number(row.rating_count) || 1,
    experience_years: Number(row.experience_years) || 3,
    education: row.education ?? null,
    tags,
    // Optional OpportunitySummary fields left as defaults
    stipend_amount: null,
    stipend_currency: null,
    internship_type: null,
    degree_level: null,
    funding_type: null,
    country: null,
    event_type: null,
    starts_at: null,
    rent_amount: null,
    rent_currency: null,
    room_type: null,
    gender_preference: null,
    listing_status: 'available',
    image_urls: [],
    city: null,
    area: null,
    available_rooms: null,
    total_rooms: null,
    utilities_included: false,
    bachelor_friendly: false,
  };
}

/**
 * Fetch mentors feed with client-side & server-side filter evaluation.
 * Returns real mentors from Supabase opportunities table.
 */
export async function fetchMentors(filters: MentorFilters = {}): Promise<MentorSummary[]> {
  let query = supabase
    .from('opportunities')
    .select(MENTOR_SELECT)
    .eq('type', 'mentorship')
    .eq('status', 'published');

  if (filters.mode && filters.mode !== 'all') {
    query = query.eq('opportunity_mode', filters.mode);
  }

  const { data, error } = await query
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) fail('Could not load mentors', error.message);

  let rows: MentorSummary[] = (data as unknown as RawMentorRow[]).map(formatMentorSummary);

  // 1. Text search filter (matches name, organization, summary, education, location, tags)
  if (filters.q && filters.q.trim()) {
    const qLower = filters.q.trim().toLowerCase();
    rows = rows.filter((mentor) => {
      const matchName = mentor.title.toLowerCase().includes(qLower);
      const matchOrg = mentor.organization_name.toLowerCase().includes(qLower);
      const matchSummary = (mentor.summary ?? '').toLowerCase().includes(qLower);
      const matchEdu = (mentor.education ?? '').toLowerCase().includes(qLower);
      const matchLoc = (mentor.location ?? '').toLowerCase().includes(qLower);
      const matchTag = mentor.tags.some((tag) => tag.toLowerCase().includes(qLower));
      return matchName || matchOrg || matchSummary || matchEdu || matchLoc || matchTag;
    });
  }

  // 2. Category filter
  if (filters.category && filters.category !== 'all') {
    const cat = findMentorCategory(filters.category);
    if (cat && cat.tags.length > 0) {
      rows = rows.filter((mentor) =>
        mentor.tags.some((t) => cat.tags.includes(t.toLowerCase())),
      );
    }
  }

  // 3. Institution filter
  if (filters.institution && filters.institution !== 'all') {
    const instLower = filters.institution.toLowerCase();
    rows = rows.filter((mentor) => {
      const org = mentor.organization_name.toLowerCase();
      const edu = (mentor.education ?? '').toLowerCase();
      const loc = (mentor.location ?? '').toLowerCase();
      return org.includes(instLower) || edu.includes(instLower) || loc.includes(instLower);
    });
  }

  // 4. Experience filter
  if (filters.experience && filters.experience !== 'all') {
    if (filters.experience === '1_2') {
      rows = rows.filter((m) => m.experience_years >= 1 && m.experience_years <= 2);
    } else if (filters.experience === '3_5') {
      rows = rows.filter((m) => m.experience_years >= 3 && m.experience_years <= 5);
    } else if (filters.experience === '5_plus') {
      rows = rows.filter((m) => m.experience_years >= 5);
    }
  }

  // 5. Rating filter
  if (filters.minRating && filters.minRating > 0) {
    rows = rows.filter((m) => m.rating_avg >= filters.minRating!);
  }

  return rows;
}

/**
 * Get detailed profile for a single mentor by opportunity ID.
 */
export async function getMentorDetail(id: string): Promise<MentorDetail> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      opportunity_tags (
        tags (
          name
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) fail('Could not load mentor profile', error.message);

  const row = data as unknown as RawMentorRow & {
    description: string | null;
    eligibility: string | null;
    source_name: string | null;
    source_url: string | null;
  };

  const summary = formatMentorSummary(row);

  return {
    ...summary,
    description: row.description ?? null,
    eligibility: row.eligibility ?? null,
    source_name: row.source_name ?? null,
    source_url: row.source_url ?? null,
    published_at: row.published_at ?? null,
  };
}

/**
 * Submit a session booking or inquiry for a mentor into mentorship_requests.
 */
export async function bookMentorSession(payload: BookSessionPayload) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new MentorshipError('Please sign in to book a session with a mentor');
  }

  const { data, error } = await supabase
    .from('mentorship_requests')
    .insert({
      student_id: user.id,
      opportunity_id: payload.opportunity_id,
      topic: payload.topic.trim(),
      message: payload.message.trim(),
      preferred_date: payload.preferred_date || null,
      preferred_time: payload.preferred_time?.trim() || null,
      session_mode: payload.session_mode || 'online',
      contact_email: payload.contact_email?.trim() || user.email || null,
      contact_phone: payload.contact_phone?.trim() || null,
      request_type: payload.request_type || 'session',
      status: 'pending',
    })
    .select()
    .single();

  if (error) fail('Could not send session booking', error.message);
  return data;
}

/**
 * Pull distinct institutions/universities from mentor records for the filter dropdown.
 */
export async function fetchMentorInstitutions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('organization_name, education, location')
    .eq('type', 'mentorship')
    .eq('status', 'published');

  if (error || !data) return ['Khulna University', 'KUET', 'University of Dhaka', 'BUET', 'ShopUp', 'Pathao', 'Brain Station 23', 'bKash'];

  const found = new Set<string>();
  for (const item of data) {
    if (item.organization_name) {
      const parts = item.organization_name.split(/Â·|\|/);
      const org = parts[parts.length - 1]?.trim();
      if (org && org.length > 2) found.add(org);
    }
    if (item.education) {
      const parts = item.education.split(/Â·|\|/);
      const edu = parts[parts.length - 1]?.trim();
      if (edu && edu.length > 2) found.add(edu);
    }
  }

  return Array.from(found).sort((a, b) => a.localeCompare(b));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Screen 8: My Sessions â€” read the current user's mentorship_requests
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Fetch the current user's session bookings from mentorship_requests,
 * joined with the mentor opportunity for display name / avatar.
 */
export async function fetchMySessions(tab: 'upcoming' | 'past'): Promise<MentorSession[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('mentorship_requests')
    .select(`
      id,
      opportunity_id,
      topic,
      message,
      preferred_date,
      preferred_time,
      session_mode,
      request_type,
      status,
      created_at,
      opportunities (
        title,
        organization_name,
        image_url
      )
    `)
    .eq('student_id', user.id)
    .eq('request_type', 'session');

  if (tab === 'upcoming') {
    query = query
      .or(`preferred_date.is.null,preferred_date.gte.${today}`)
      .in('status', ['pending', 'accepted', 'confirmed']);
  } else {
    query = query
      .or(`preferred_date.lt.${today},status.eq.completed,status.eq.closed,status.eq.cancelled,status.eq.rejected`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) fail('Could not load sessions', error.message);

  return (data as any[]).map((row): MentorSession => {
    const opp = row.opportunities as {
      title: string;
      organization_name: string;
      image_url: string | null;
    } | null;

    let normalizedStatus: MentorSession['status'] = 'pending';
    if (row.status === 'accepted' || row.status === 'confirmed') normalizedStatus = 'confirmed';
    else if (row.status === 'closed' || row.status === 'completed') normalizedStatus = 'completed';
    else if (row.status === 'rejected' || row.status === 'cancelled') normalizedStatus = 'cancelled';

    return {
      id: row.id,
      opportunity_id: row.opportunity_id,
      mentor_title: opp?.title ?? 'Mentor',
      mentor_organization: opp?.organization_name ?? '',
      mentor_image_url: opp?.image_url ?? null,
      topic: row.topic,
      message: row.message,
      preferred_date: row.preferred_date ?? null,
      preferred_time: row.preferred_time ?? null,
      session_mode: row.session_mode ?? 'online',
      session_type: row.topic ?? null,
      status: normalizedStatus,
      created_at: row.created_at,
    };
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Screen 7: Chat â€” mentor message thread
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Fetch all chat messages for a given mentor opportunity thread.
 */
export async function fetchMentorMessages(opportunityId: string): Promise<MentorMessage[]> {
  const { data, error } = await supabase
    .from('mentor_messages')
    .select('id, opportunity_id, sender_id, content, is_read, created_at, attachment_url, attachment_type')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: true });

  if (error) fail('Could not load chat messages', error.message);
  return (data ?? []) as MentorMessage[];
}

/**
 * Upload an image attachment for mentor chat to storage.
 */
export async function uploadChatAttachment(
  localUri: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to upload attachments');

  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const response = await fetch(localUri);
  const bytes = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('community-media')
    .upload(path, bytes, { contentType: mimeType, upsert: false });

  if (error) {
    throw new MentorshipError(`Could not upload attachment: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('community-media').getPublicUrl(path);

  return publicUrl;
}

/**
 * Send a chat message (with optional image/document attachment) to a mentor's thread.
 */
export async function sendMentorMessage(
  opportunityId: string,
  content: string,
  attachmentUrl?: string | null,
  attachmentType?: string | null,
): Promise<MentorMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to send a message');

  const trimmed = content.trim();
  if (!trimmed && !attachmentUrl) {
    throw new MentorshipError('Please type a message or select an attachment');
  }
  if (trimmed.length > 2000) throw new MentorshipError('Message is too long (max 2000 chars)');

  const { data, error } = await supabase
    .from('mentor_messages')
    .insert({
      opportunity_id: opportunityId,
      sender_id: user.id,
      content: trimmed,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || (attachmentUrl ? 'image' : null),
    })
    .select()
    .single();

  if (error) fail('Could not send message', error.message);
  return data as MentorMessage;
}

/**
 * Fetch all mentor conversations for the current user.
 */
export async function fetchMyConversations(): Promise<MentorConversationSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch recent messages
  const { data: messages, error } = await supabase
    .from('mentor_messages')
    .select('opportunity_id, content, created_at, is_read, sender_id, attachment_url')
    .order('created_at', { ascending: false });

  if (error || !messages || messages.length === 0) return [];

  // Group by opportunity_id and pick latest message + count unread
  const map = new Map<
    string,
    { last_message: string; last_message_at: string; unread_count: number }
  >();

  for (const msg of messages) {
    if (!map.has(msg.opportunity_id)) {
      map.set(msg.opportunity_id, {
        last_message: msg.content || (msg.attachment_url ? '📷 [Image attachment]' : ''),
        last_message_at: msg.created_at,
        unread_count: !msg.is_read && msg.sender_id !== user.id ? 1 : 0,
      });
    } else {
      const entry = map.get(msg.opportunity_id)!;
      if (!msg.is_read && msg.sender_id !== user.id) {
        entry.unread_count += 1;
      }
    }
  }

  const oppIds = Array.from(map.keys());
  if (oppIds.length === 0) return [];

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, organization_name, image_url')
    .in('id', oppIds);

  const oppMap = new Map((opps ?? []).map((o) => [o.id, o]));

  return oppIds.map((id) => {
    const opp = oppMap.get(id);
    const entry = map.get(id)!;
    return {
      opportunity_id: id,
      mentor_title: opp?.title ?? 'Mentor Conversation',
      mentor_organization: opp?.organization_name ?? '',
      mentor_image_url: opp?.image_url ?? null,
      last_message: entry.last_message,
      last_message_at: entry.last_message_at,
      unread_count: entry.unread_count,
    };
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Screen 9: Ask a Question (Free)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Fetch the current user's previously submitted questions.
 */
export async function fetchMyMentorQuestions(): Promise<MentorQuestion[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('mentor_questions')
    .select('id, student_id, opportunity_id, category, question, answer, answered_at, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  if (error) fail('Could not load questions', error.message);
  return (data ?? []) as MentorQuestion[];
}

/**
 * Submit a free question to the mentor pool.
 */
export async function submitMentorQuestion(
  payload: SubmitQuestionPayload,
): Promise<MentorQuestion> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to ask a question');

  const trimmed = payload.question.trim();
  if (!trimmed) throw new MentorshipError('Question cannot be empty');
  if (trimmed.length > 500) throw new MentorshipError('Question is too long (max 500 characters)');

  const { data, error } = await supabase
    .from('mentor_questions')
    .insert({
      student_id: user.id,
      opportunity_id: payload.opportunity_id ?? null,
      category: payload.category,
      question: trimmed,
      status: 'pending',
    })
    .select()
    .single();

  if (error) fail('Could not submit question', error.message);
  return data as MentorQuestion;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Screen 10: Mentor Community Discussions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Fetch mentor discussions joined with the mentor opportunity details.
 * Also fetches the current user's likes to mark which discussions they've liked.
 */
export async function fetchMentorDiscussions(): Promise<MentorDiscussion[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('mentor_discussions')
    .select(`
      id,
      opportunity_id,
      title,
      content,
      likes_count,
      comments_count,
      created_at,
      opportunities (
        title,
        organization_name,
        education,
        image_url,
        verified
      )
    `)
    .order('created_at', { ascending: false });

  if (error) fail('Could not load mentor discussions', error.message);

  // Fetch user's likes separately to avoid join complexity
  let likedSet = new Set<string>();
  if (user) {
    const { data: likesData } = await supabase
      .from('mentor_discussion_likes')
      .select('discussion_id')
      .eq('user_id', user.id);
    likedSet = new Set((likesData ?? []).map((l: { discussion_id: string }) => l.discussion_id));
  }

  return (data as any[]).map((row): MentorDiscussion => {
    const opp = row.opportunities as {
      title: string;
      organization_name: string;
      education: string | null;
      image_url: string | null;
      verified: boolean;
    } | null;
    return {
      id: row.id,
      opportunity_id: row.opportunity_id,
      mentor_title: opp?.title ?? 'Mentor',
      mentor_organization: opp?.organization_name ?? '',
      mentor_education: opp?.education ?? null,
      mentor_image_url: opp?.image_url ?? null,
      mentor_verified: opp?.verified ?? false,
      title: row.title,
      content: row.content,
      likes_count: Number(row.likes_count) ?? 0,
      comments_count: Number(row.comments_count) ?? 0,
      created_at: row.created_at,
      user_liked: likedSet.has(row.id),
    };
  });
}

// ── Discussion Likes ──────────────────────────────────────────────────────────

export async function toggleDiscussionLike(
  discussionId: string,
  currentlyLiked: boolean,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to like discussions');

  if (currentlyLiked) {
    const { error } = await supabase
      .from('mentor_discussion_likes')
      .delete()
      .eq('discussion_id', discussionId)
      .eq('user_id', user.id);
    if (error) fail('Could not unlike discussion', error.message);
  } else {
    const { error } = await supabase
      .from('mentor_discussion_likes')
      .insert({ discussion_id: discussionId, user_id: user.id });
    if (error && error.code !== '23505') fail('Could not like discussion', error.message);
  }
}

// ── Discussion Comments ───────────────────────────────────────────────────────

export async function fetchDiscussionComments(
  discussionId: string,
): Promise<MentorDiscussionComment[]> {
  const { data, error } = await supabase
    .from('mentor_discussion_comments')
    .select('id, discussion_id, user_id, content, created_at, profiles(full_name, avatar_url)')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true });

  if (error) fail('Could not load comments', error.message);
  if (!data || data.length === 0) return [];

  // Fallback for cases where profiles embed returned null (e.g. unauthenticated)
  const missingProfiles = data.filter((c: any) => !c.profiles);
  let fallbackMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  if (missingProfiles.length > 0) {
    const userIds = Array.from(new Set(missingProfiles.map((c: any) => c.user_id as string)));
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    for (const p of profs ?? []) {
      fallbackMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    }
  }

  return (data as any[]).map((row): MentorDiscussionComment => {
    const prof = row.profiles || fallbackMap[row.user_id];
    return {
      id: row.id,
      discussion_id: row.discussion_id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      user_full_name: prof?.full_name ?? 'Student',
      user_avatar_url: prof?.avatar_url ?? null,
    };
  });
}

export async function addDiscussionComment(
  discussionId: string,
  content: string,
): Promise<MentorDiscussionComment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to comment');

  const trimmed = content.trim();
  if (!trimmed) throw new MentorshipError('Comment cannot be empty');
  if (trimmed.length > 1000) throw new MentorshipError('Comment is too long (max 1000 chars)');

  const { data, error } = await supabase
    .from('mentor_discussion_comments')
    .insert({ discussion_id: discussionId, user_id: user.id, content: trimmed })
    .select('id, discussion_id, user_id, content, created_at')
    .single();

  if (error) fail('Could not add comment', error.message);
  return data as MentorDiscussionComment;
}

// ── Mentor Applications ───────────────────────────────────────────────────────

/**
 * Fetch the current user's most recent mentor application.
 */
export async function fetchMyMentorApplication(): Promise<MentorApplication | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('mentor_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) fail('Could not load mentor application', error.message);
  return data as MentorApplication | null;
}

/**
 * Submit a new mentor application.
 */
export async function submitMentorApplication(
  payload: SubmitMentorApplicationPayload,
): Promise<MentorApplication> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to apply as a mentor');

  const { data, error } = await supabase
    .from('mentor_applications')
    .insert({
      user_id: user.id,
      full_name: payload.full_name.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim() || null,
      organization: payload.organization.trim(),
      designation: payload.designation.trim(),
      experience_years: payload.experience_years,
      education: payload.education.trim(),
      expertise_areas: payload.expertise_areas,
      bio: payload.bio.trim(),
      linkedin_url: payload.linkedin_url?.trim() || null,
      session_mode: payload.session_mode,
      status: 'pending',
    })
    .select()
    .single();

  if (error) fail('Could not submit mentor application', error.message);
  return data as MentorApplication;
}

/**
 * Fetch sessions/bookings for the current approved mentor (their opportunity_id's requests).
 */
export async function fetchMentorPortalSessions(): Promise<MentorSession[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // First get the mentor's opportunity_id
  const { data: appData } = await supabase
    .from('mentor_applications')
    .select('opportunity_id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle();

  if (!appData?.opportunity_id) return [];

  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(`
      id,
      student_id,
      opportunity_id,
      topic,
      message,
      preferred_date,
      preferred_time,
      session_mode,
      request_type,
      status,
      created_at
    `)
    .eq('opportunity_id', appData.opportunity_id)
    .order('created_at', { ascending: false });

  if (error) fail('Could not load mentor sessions', error.message);

  // Fetch student profiles separately
  const studentIds = (data ?? []).map((r: any) => r.student_id as string);
  let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', studentIds);
    for (const p of profiles ?? []) {
      profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    }
  }

  return (data as any[]).map((row): MentorSession => {
    const prof = profilesMap[row.student_id];
    let normalizedStatus: MentorSession['status'] = 'pending';
    if (row.status === 'accepted' || row.status === 'confirmed') normalizedStatus = 'confirmed';
    else if (row.status === 'closed' || row.status === 'completed') normalizedStatus = 'completed';
    else if (row.status === 'rejected' || row.status === 'cancelled') normalizedStatus = 'cancelled';

    return {
      id: row.id,
      opportunity_id: row.opportunity_id,
      mentor_title: prof?.full_name ?? 'Student',
      mentor_organization: '',
      mentor_image_url: prof?.avatar_url ?? null,
      topic: row.topic,
      message: row.message,
      preferred_date: row.preferred_date ?? null,
      preferred_time: row.preferred_time ?? null,
      session_mode: row.session_mode ?? 'online',
      session_type: row.topic ?? null,
      status: normalizedStatus,
      created_at: row.created_at,
    };
  });
}

/**
 * Send a message as a mentor in their own thread.
 */
export async function sendMentorReply(
  opportunityId: string,
  content: string,
): Promise<MentorMessage> {
  return sendMentorMessage(opportunityId, content);
}

/**
 * Update the mentor's own profile and cover photo.
 */
export async function updateMentorProfile(payload: UpdateMentorProfilePayload): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to update your profile');

  const { data: appData } = await supabase
    .from('mentor_applications')
    .select('id, opportunity_id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle();

  if (!appData || appData.opportunity_id !== payload.opportunity_id) {
    throw new MentorshipError('Unauthorized: You are not the approved mentor for this profile');
  }

  const { error: oppError } = await supabase
    .from('opportunities')
    .update({
      title: payload.title.trim(),
      organization_name: payload.organization_name.trim(),
      summary: payload.summary.trim(),
      description: payload.description ? payload.description.trim() : payload.summary.trim(),
      image_url: payload.image_url || null,
      cover_image_url: payload.cover_image_url || null,
      education: payload.education ? payload.education.trim() : null,
      experience_years: payload.experience_years ?? 1,
      opportunity_mode: payload.opportunity_mode || 'online',
      location: payload.location ? payload.location.trim() : null,
      source_url: payload.source_url ? payload.source_url.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.opportunity_id);

  if (oppError) fail('Could not update mentor profile', oppError.message);

  // Synchronize mentor_applications table
  await supabase
    .from('mentor_applications')
    .update({
      full_name: payload.title.trim(),
      organization: payload.organization_name.trim(),
      bio: payload.summary.trim(),
      education: payload.education ? payload.education.trim() : '',
      experience_years: payload.experience_years ?? 1,
      avatar_url: payload.image_url || null,
      cover_image_url: payload.cover_image_url || null,
      session_mode: payload.opportunity_mode || 'online',
      linkedin_url: payload.source_url ? payload.source_url.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appData.id);

  return true;
}

/**
 * Create a new community discussion as a mentor.
 */
export async function createMentorDiscussion(
  payload: CreateDiscussionPayload,
): Promise<MentorDiscussion> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to post a discussion');

  const title = payload.title.trim();
  const content = payload.content.trim();
  if (!title) throw new MentorshipError('Title cannot be empty');
  if (!content) throw new MentorshipError('Content cannot be empty');

  const { data, error } = await supabase
    .from('mentor_discussions')
    .insert({
      opportunity_id: payload.opportunity_id,
      title,
      content,
    })
    .select()
    .single();

  if (error) fail('Could not create discussion', error.message);
  return data as unknown as MentorDiscussion;
}

/**
 * Update an existing mentor discussion.
 */
export async function updateMentorDiscussion(
  payload: UpdateDiscussionPayload,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to edit discussion');

  const title = payload.title.trim();
  const content = payload.content.trim();
  if (!title) throw new MentorshipError('Title cannot be empty');
  if (!content) throw new MentorshipError('Content cannot be empty');

  const { error } = await supabase
    .from('mentor_discussions')
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.discussion_id);

  if (error) fail('Could not update discussion', error.message);
}

/**
 * Delete a mentor discussion.
 */
export async function deleteMentorDiscussion(discussionId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to delete discussion');

  const { error } = await supabase
    .from('mentor_discussions')
    .delete()
    .eq('id', discussionId);

  if (error) fail('Could not delete discussion', error.message);
}

/**
 * Update the status of a session request booked by a student.
 */
export async function updateMentorSessionStatus(
  sessionId: string,
  status: 'confirmed' | 'rejected' | 'completed' | 'cancelled',
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new MentorshipError('Please sign in to update session');

  const dbStatus =
    status === 'confirmed' ? 'accepted' : status === 'rejected' ? 'rejected' : 'completed';

  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      status: dbStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) fail('Could not update session status', error.message);
}

