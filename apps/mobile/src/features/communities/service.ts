import { supabase } from '@/lib/supabase';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityDetail,
  CommunityEvent,
  CommunityEventRsvp,
  CommunityListItem,
  CommunityMemberRole,
  CommunityPost,
  CommunityPostType,
  CommunityRecentPost,
  CommunityReportReason,
  CommunityRequest,
  ContentStatus,
} from '@kse/types';

/**
 * Community system (redesign) — discovery, membership, typed posts, comments
 * (one level), reactions, polls, events, moderation and creation requests.
 *
 * Conventions carried over from tuition/opportunities: snake_case rows cast
 * to camelCase domain types, communities↔profiles share no FK (both reference
 * auth.users) so author names merge in a second query, pagination is
 * offset-based via .range(), and spam-prone writes go through the
 * community-actions Edge Function (rate limiting) instead of direct inserts.
 */

export class CommunityError extends Error {}

function fail(context: string, message: string): never {
  throw new CommunityError(`${context}: ${message}`);
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) fail('Sign in required', 'You need to sign in first');
  return user.id;
}

async function optionalViewerId(): Promise<string | null> {
  return (await supabase.auth.getUser()).data.user?.id ?? null;
}

const COMMUNITY_BUCKET = 'community-media';

// ── Shared row shapes ────────────────────────────────────────────────────────

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
  status: ContentStatus;
  category_id: string | null;
  category: { id: string; name: string; slug: string } | null;
  university: { name: string } | null;
  department: { name: string } | null;
  community_members: { user_id: string; role: CommunityMemberRole }[];
}

const COMMUNITY_SELECT =
  'id, name, slug, description, cover_image_url, member_count, status, ' +
  'category_id, category:community_categories(id, name, slug), ' +
  'university:universities(name), department:departments(name), ' +
  'community_members(user_id, role)';

function summarize(row: CommunityRow, viewerId: string | null): CommunityListItem {
  const membership = row.community_members.find((m) => m.user_id === viewerId);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? null,
    universityName: row.university?.name ?? null,
    departmentName: row.department?.name ?? null,
    memberCount: row.member_count,
    isMember: Boolean(membership),
    role: membership?.role ?? null,
  };
}

async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', unique);
  if (error) fail('Could not load content', error.message);
  const names = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; full_name: string | null }[]) {
    names.set(row.id, row.full_name ?? 'Member');
  }
  return names;
}

/**
 * Avatar URLs keyed by user id. The avatars bucket is public so we can read
 * the URL without re-fetching a signed link per card. Posts/comments use this
 * to render the actual profile picture when present (falls back to initials).
 */
async function fetchProfileAvatars(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', unique);
  if (error) fail('Could not load avatars', error.message);
  const avatars = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; avatar_url: string | null }[]) {
    if (row.avatar_url) avatars.set(row.id, row.avatar_url);
  }
  return avatars;
}

/** Combined fetch — keeps a single round-trip per query for both name + avatar. */
async function fetchProfileInfo(
  ids: string[],
): Promise<Map<string, { name: string; avatarUrl: string | null }>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', unique);
  if (error) fail('Could not load profiles', error.message);
  const info = new Map<string, { name: string; avatarUrl: string | null }>();
  for (const row of (data ?? []) as {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[]) {
    info.set(row.id, { name: row.full_name ?? 'Member', avatarUrl: row.avatar_url });
  }
  return info;
}

// ── Categories / discovery ───────────────────────────────────────────────────

export async function listCategories(): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from('community_categories')
    .select('id, name, slug')
    .order('sort_order');
  if (error) fail('Could not load categories', error.message);
  return (data ?? []) as CommunityCategory[];
}

export interface CommunityListFilters {
  query?: string;
  categoryId?: string | null;
  universityId?: string | null;
}

export interface CommunityPage {
  items: CommunityListItem[];
  page: number;
  hasMore: boolean;
}

/** Browse communities with search + category filter, paginated. */
export async function fetchCommunities(
  filters: CommunityListFilters,
  page: number,
  pageSize = 12,
): Promise<CommunityPage> {
  const viewerId = await optionalViewerId();

  let query = supabase
    .from('communities')
    .select(COMMUNITY_SELECT)
    .eq('status', 'active')
    .order('member_count', { ascending: false });
  if (filters.query) query = query.ilike('name', `%${filters.query}%`);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.universityId) query = query.eq('university_id', filters.universityId);

  const from = (page - 1) * pageSize;
  const { data, error } = await query.range(from, from + pageSize - 1);
  if (error) fail('Could not load communities', error.message);

  const rows = (data ?? []) as unknown as CommunityRow[];
  return {
    items: rows.map((row) => summarize(row, viewerId)),
    page,
    hasMore: rows.length === pageSize,
  };
}

/** Communities the viewer joined (the "Following" tab). */
export async function fetchJoinedCommunities(): Promise<CommunityListItem[]> {
  const viewerId = await requireUserId();

  const { data, error } = await supabase
    .from('community_members')
    .select(`community:communities!inner(${COMMUNITY_SELECT})`)
    .eq('user_id', viewerId)
    .eq('community.status', 'active')
    .order('joined_at', { ascending: false })
    .limit(50);
  if (error) fail('Could not load your communities', error.message);

  const rows = ((data ?? []) as unknown as { community: CommunityRow }[]).map(
    (r) => r.community,
  );
  return rows.map((row) => summarize(row, viewerId));
}

/** Rule-based recommendations (recommended_communities RPC, spec §Discovery). */
export async function fetchRecommendedCommunities(limit = 6): Promise<CommunityListItem[]> {
  const { data, error } = await supabase.rpc('recommended_communities', { p_limit: limit });
  if (error) fail('Could not load recommendations', error.message);

  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    category_id: string | null;
    category_name: string | null;
    university_id: string | null;
    department_id: string | null;
    member_count: number;
    score: number;
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    categoryId: row.category_id,
    categoryName: row.category_name,
    universityName: null,
    departmentName: null,
    memberCount: row.member_count,
    isMember: false, // RPC already excludes joined communities
    role: null,
    score: row.score,
  }));
}

/** Most popular active communities (member_count ordered). */
export async function fetchActiveCommunities(limit = 6): Promise<CommunityListItem[]> {
  const page = await fetchCommunities({}, 1, limit);
  return page.items;
}

// ── Trending discussions + upcoming events (For You tab) ─────────────────────

/** Trending posts (trending_community_posts RPC): engagement-weighted. */
export async function fetchTrendingPosts(limit = 5, days = 7): Promise<CommunityRecentPost[]> {
  const { data, error } = await supabase.rpc('trending_community_posts', {
    p_limit: limit,
    p_days: days,
  });
  if (error) fail('Could not load trending discussions', error.message);

  const rows = (data ?? []) as unknown as {
    id: string;
    community_id: string;
    community_name: string;
    author_id: string;
    post_type: CommunityPostType;
    content: string;
    image_url: string | null;
    link_url: string | null;
    comment_count: number;
    reaction_count: number;
    created_at: string;
  }[];
  const info = await fetchProfileInfo(rows.map((row) => row.author_id));
  return rows.map((row) => {
    const profile = info.get(row.author_id);
    return {
      id: row.id,
      communityId: row.community_id,
      communityName: row.community_name,
      authorId: row.author_id,
      authorName: profile?.name ?? 'Member',
      authorAvatarUrl: profile?.avatarUrl ?? null,
      postType: row.post_type,
      content: row.content,
      imageUrl: row.image_url,
      linkUrl: row.link_url,
      isPinned: false,
      isLocked: false,
      commentCount: row.comment_count,
      reactionCount: row.reaction_count,
      viewerReacted: false,
      status: 'active' as ContentStatus,
      createdAt: row.created_at,
    };
  });
}

interface EventRow {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  mode: 'online' | 'offline' | 'hybrid';
  meeting_url: string | null;
  organizer: string | null;
  image_url: string | null;
  status: ContentStatus;
  community: { name: string } | null;
  community_event_attendees: { user_id: string; rsvp: CommunityEventRsvp }[];
}

const EVENT_SELECT =
  'id, community_id, title, description, starts_at, ends_at, location, mode, ' +
  'meeting_url, organizer, image_url, status, community:communities(name), ' +
  'community_event_attendees(user_id, rsvp)';

function toEvent(row: EventRow, viewerId: string | null): CommunityEvent {
  const mine = row.community_event_attendees.find((a) => a.user_id === viewerId);
  return {
    id: row.id,
    communityId: row.community_id,
    communityName: row.community?.name ?? undefined,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    mode: row.mode,
    meetingUrl: row.meeting_url,
    organizer: row.organizer,
    imageUrl: row.image_url,
    attendingCount: row.community_event_attendees.filter((a) => a.rsvp === 'attending').length,
    interestedCount: row.community_event_attendees.filter((a) => a.rsvp === 'interested').length,
    viewerRsvp: mine?.rsvp ?? null,
  };
}

/** Upcoming community events across active communities (For You tab). */
export async function fetchUpcomingEvents(limit = 5): Promise<CommunityEvent[]> {
  const viewerId = await optionalViewerId();
  const { data, error } = await supabase
    .from('community_events')
    .select(EVENT_SELECT)
    .eq('status', 'active')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(limit);
  if (error) fail('Could not load upcoming events', error.message);
  return ((data ?? []) as unknown as EventRow[]).map((row) => toEvent(row, viewerId));
}

// ── Community detail ─────────────────────────────────────────────────────────

export async function getCommunity(id: string): Promise<CommunityDetail> {
  const viewerId = await optionalViewerId();

  const [communityResult, rulesResult, moderatorIdsResult] = await Promise.all([
    supabase.from('communities').select(COMMUNITY_SELECT).eq('id', id).maybeSingle(),
    supabase.from('community_rules').select('content').eq('community_id', id).order('sort_order'),
    supabase
      .from('community_members')
      .select('user_id, role')
      .eq('community_id', id)
      .in('role', ['moderator', 'owner'])
      .order('role'),
  ]);

  if (communityResult.error) fail('Could not load this community', communityResult.error.message);
  if (!communityResult.data) fail('Could not load this community', 'Community not found');
  if (rulesResult.error) fail('Could not load this community', rulesResult.error.message);
  if (moderatorIdsResult.error) {
    fail('Could not load this community', moderatorIdsResult.error.message);
  }

  const row = communityResult.data as unknown as CommunityRow;
  const names = await fetchProfileNames(
    ((moderatorIdsResult.data ?? []) as { user_id: string }[]).map((m) => m.user_id),
  );
  return {
    ...summarize(row, viewerId),
    status: row.status,
    rules: ((rulesResult.data ?? []) as { content: string }[]).map((r) => r.content),
    moderators: ((moderatorIdsResult.data ?? []) as {
      user_id: string;
      role: CommunityMemberRole;
    }[]).map((m) => ({
      userId: m.user_id,
      fullName: names.get(m.user_id) ?? 'Member',
      role: m.role,
    })),
  };
}

// ── Membership ───────────────────────────────────────────────────────────────

/** Join the community as a member. RLS enforces role=member + active. */
export async function joinCommunity(communityId: string): Promise<void> {
  const viewerId = await requireUserId();
  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: viewerId, role: 'member' });
  if (error) fail('Could not join community', error.message);
}

/** Self-service leave (owners must transfer or contact an admin). */
export async function leaveCommunity(communityId: string): Promise<void> {
  const viewerId = await requireUserId();
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', viewerId)
    .in('role', ['member', 'moderator']);
  if (error) fail('Could not leave community', error.message);
}

// ── Posts ────────────────────────────────────────────────────────────────────

interface PostRow {
  id: string;
  community_id: string;
  author_id: string;
  post_type: CommunityPostType;
  content: string;
  image_url: string | null;
  link_url: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  comment_count: number;
  reaction_count: number;
  status: ContentStatus;
  created_at: string;
  community?: { name: string } | null;
}

const POST_SELECT =
  'id, community_id, author_id, post_type, content, image_url, link_url, ' +
  'is_pinned, is_locked, comment_count, reaction_count, status, created_at';

interface PollRow {
  id: string;
  post_id: string;
  closes_at: string | null;
  result_visibility: 'realtime' | 'after_vote' | 'after_close';
  community_poll_options: { id: string; option_text: string; sort_order: number }[];
  community_poll_votes: { option_id: string; user_id: string }[];
}

/**
 * Poll assembly for a set of posts: polls + options in one query each, votes
 * restricted by the visibility RLS policy (invisible votes simply don't
 * come back — counts stay hidden until allowed).
 */
async function attachPolls(posts: CommunityPost[], viewerId: string | null): Promise<void> {
  const pollPostIds = posts.filter((p) => p.postType === 'poll').map((p) => p.id);
  if (pollPostIds.length === 0) return;

  const { data, error } = await supabase
    .from('community_polls')
    .select(
      'id, post_id, closes_at, result_visibility, ' +
        'community_poll_options(id, option_text, sort_order), ' +
        'community_poll_votes(option_id, user_id)',
    )
    .in('post_id', pollPostIds);
  if (error) fail('Could not load polls', error.message);

  for (const row of (data ?? []) as unknown as PollRow[]) {
    const post = posts.find((p) => p.id === row.post_id);
    if (!post) continue;
    const closed = row.closes_at != null && new Date(row.closes_at).getTime() <= Date.now();
    // Votes hidden by RLS ⇒ counts unknown to this viewer.
    const votesVisible = row.community_poll_votes.length > 0 || closed;
    const totalVotes = votesVisible ? row.community_poll_votes.length : null;
    const myVote = viewerId
      ? row.community_poll_votes.find((v) => v.user_id === viewerId)
      : undefined;
    post.poll = {
      id: row.id,
      closesAt: row.closes_at,
      closed,
      resultVisibility: row.result_visibility,
      totalVotes,
      options: [...row.community_poll_options]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((option) => ({
          id: option.id,
          text: option.option_text,
          voteCount: votesVisible
            ? row.community_poll_votes.filter((v) => v.option_id === option.id).length
            : null,
        })),
      viewerVotedOptionId: myVote?.option_id ?? null,
    };
  }
}

async function decoratePosts(rows: PostRow[], viewerId: string | null): Promise<CommunityPost[]> {
  const profiles = await fetchProfileInfo(rows.map((row) => row.author_id));

  let reactedIds = new Set<string>();
  if (viewerId && rows.length > 0) {
    const { data, error } = await supabase
      .from('community_reactions')
      .select('post_id')
      .eq('user_id', viewerId)
      .in('post_id', rows.map((row) => row.id));
    if (error) fail('Could not load posts', error.message);
    reactedIds = new Set(((data ?? []) as { post_id: string }[]).map((r) => r.post_id));
  }

  const posts: CommunityPost[] = rows.map((row) => ({
    id: row.id,
    communityId: row.community_id,
    communityName: row.community?.name ?? undefined,
    authorId: row.author_id,
    authorName: profiles.get(row.author_id)?.name ?? 'Member',
    authorAvatarUrl: profiles.get(row.author_id)?.avatarUrl ?? null,
    postType: row.post_type,
    content: row.content,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    isPinned: row.is_pinned,
    isLocked: row.is_locked,
    commentCount: row.comment_count,
    reactionCount: row.reaction_count,
    viewerReacted: reactedIds.has(row.id),
    status: row.status,
    createdAt: row.created_at,
  }));
  await attachPolls(posts, viewerId);
  return posts;
}

export interface PostPage {
  items: CommunityPost[];
  page: number;
  hasMore: boolean;
}

/** Community feed: pinned first, then newest, paginated. */
export async function listCommunityPosts(
  communityId: string,
  page: number,
  pageSize = 10,
): Promise<PostPage> {
  const viewerId = await optionalViewerId();
  const from = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from('community_posts')
    .select(POST_SELECT)
    .eq('community_id', communityId)
    .eq('status', 'active')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) fail('Could not load posts', error.message);

  const rows = (data ?? []) as unknown as PostRow[];
  return {
    items: await decoratePosts(rows, viewerId),
    page,
    hasMore: rows.length === pageSize,
  };
}

/** Single post (post detail screen) with poll + community name. */
export async function getPost(postId: string): Promise<CommunityPost> {
  const viewerId = await optionalViewerId();
  const { data, error } = await supabase
    .from('community_posts')
    .select(`${POST_SELECT}, community:communities(name)`)
    .eq('id', postId)
    .maybeSingle();
  if (error) fail('Could not load post', error.message);
  if (!data) fail('Could not load post', 'Post not found');
  const [post] = await decoratePosts([data as unknown as PostRow], viewerId);
  return post;
}

export interface CreatePostInput {
  communityId: string;
  postType: CommunityPostType;
  content: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  poll?: {
    options: string[];
    closesAt?: string | null;
    resultVisibility: 'realtime' | 'after_vote' | 'after_close';
  };
}

/** Creates a post (and its poll) via the rate-limited Edge Function. */
export async function createPost(input: CreatePostInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('community-actions', {
    body: {
      action: 'create_post',
      payload: {
        community_id: input.communityId,
        post_type: input.postType,
        content: input.content.trim(),
        image_url: input.imageUrl ?? null,
        link_url: input.linkUrl ?? null,
        poll: input.poll
          ? {
              options: input.poll.options,
              closes_at: input.poll.closesAt ?? null,
              result_visibility: input.poll.resultVisibility,
            }
          : undefined,
      },
    },
  });
  if (error) fail('Could not post', error.message);
  const fnError = (data as { error?: string } | null)?.error;
  if (fnError) fail('Could not post', fnError);
}

/** Like/unlike (single 'like' reaction; PK prevents doubles). */
export async function toggleReaction(postId: string, currentlyReacted: boolean): Promise<void> {
  const viewerId = await requireUserId();
  if (currentlyReacted) {
    const { error } = await supabase
      .from('community_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', viewerId);
    if (error) fail('Could not remove reaction', error.message);
  } else {
    const { error } = await supabase
      .from('community_reactions')
      .insert({ post_id: postId, user_id: viewerId });
    if (error) fail('Could not react', error.message);
  }
}

/** Pin/unpin (moderators + owners; enforced by RLS). */
export async function setPostPinned(post: {
  communityId: string;
  postId: string;
  isPinned: boolean;
}): Promise<void> {
  const viewerId = await requireUserId();
  if (post.isPinned) {
    const { error } = await supabase.from('community_pins').insert({
      community_id: post.communityId,
      post_id: post.postId,
      pinned_by: viewerId,
    });
    if (error) fail('Could not pin post', error.message);
  } else {
    const { error } = await supabase.from('community_pins').delete().eq('post_id', post.postId);
    if (error) fail('Could not unpin post', error.message);
  }
}

/** Lock/unlock the discussion under a post (moderators + owners). */
export async function setPostLocked(postId: string, locked: boolean): Promise<void> {
  const { error } = await supabase
    .from('community_posts')
    .update({ is_locked: locked })
    .eq('id', postId);
  if (error) fail('Could not update post', error.message);
}

/** Soft delete: authors on own posts, moderators on any (guard trigger). */
export async function softDeletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('community_posts')
    .update({ status: 'removed' })
    .eq('id', postId)
    .eq('status', 'active');
  if (error) fail('Could not delete post', error.message);
}

// ── Comments ─────────────────────────────────────────────────────────────────

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  status: ContentStatus;
  created_at: string;
}

/**
 * Comments for a post (top-level + one level of replies). Threads are small
 * in this MVP; a 200-comment ceiling keeps the payload bounded.
 */
export async function listComments(postId: string): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from('community_comments')
    .select('id, post_id, author_id, parent_id, content, status, created_at')
    .eq('post_id', postId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) fail('Could not load comments', error.message);

  const rows = (data ?? []) as unknown as CommentRow[];
  const profiles = await fetchProfileInfo(rows.map((row) => row.author_id));
  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    authorName: profiles.get(row.author_id)?.name ?? 'Member',
    authorAvatarUrl: profiles.get(row.author_id)?.avatarUrl ?? null,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function createComment(input: {
  postId: string;
  parentId?: string | null;
  content: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('community-actions', {
    body: {
      action: 'create_comment',
      payload: {
        post_id: input.postId,
        parent_id: input.parentId ?? null,
        content: input.content.trim(),
      },
    },
  });
  if (error) fail('Could not comment', error.message);
  const fnError = (data as { error?: string } | null)?.error;
  if (fnError) fail('Could not comment', fnError);
}

export async function softDeleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('community_comments')
    .update({ status: 'removed' })
    .eq('id', commentId)
    .eq('status', 'active');
  if (error) fail('Could not delete comment', error.message);
}

// ── Polls ────────────────────────────────────────────────────────────────────

/** One vote per user per poll; RLS enforces membership + open window. */
export async function votePoll(pollId: string, optionId: string): Promise<void> {
  const viewerId = await requireUserId();
  const { error } = await supabase
    .from('community_poll_votes')
    .insert({ poll_id: pollId, option_id: optionId, user_id: viewerId });
  if (error) fail('Could not vote', error.message);
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface EventPage {
  items: CommunityEvent[];
  page: number;
  hasMore: boolean;
}

/** A community's events, soonest first, paginated. */
export async function listCommunityEvents(
  communityId: string,
  page: number,
  pageSize = 10,
): Promise<EventPage> {
  const viewerId = await optionalViewerId();
  const from = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from('community_events')
    .select(EVENT_SELECT)
    .eq('community_id', communityId)
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) fail('Could not load events', error.message);

  const rows = (data ?? []) as unknown as EventRow[];
  return {
    items: rows.map((row) => toEvent(row, viewerId)),
    page,
    hasMore: rows.length === pageSize,
  };
}

/** RSVP (or clear) — members only, enforced by RLS. */
export async function setEventRsvp(
  eventId: string,
  rsvp: CommunityEventRsvp | null,
): Promise<void> {
  const viewerId = await requireUserId();
  if (rsvp == null) {
    const { error } = await supabase
      .from('community_event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', viewerId);
    if (error) fail('Could not update RSVP', error.message);
    return;
  }
  const { error } = await supabase
    .from('community_event_attendees')
    .upsert({ event_id: eventId, user_id: viewerId, rsvp }, { onConflict: 'event_id,user_id' });
  if (error) fail('Could not update RSVP', error.message);
}

export interface CreateEventInput {
  communityId: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  mode: 'online' | 'offline' | 'hybrid';
  location?: string | null;
  meetingUrl?: string | null;
  organizer?: string | null;
}

/** Create a community event (moderators/owners only, enforced by RLS). */
export async function createEvent(input: CreateEventInput): Promise<void> {
  const viewerId = await requireUserId();
  const { error } = await supabase.from('community_events').insert({
    community_id: input.communityId,
    created_by: viewerId,
    title: input.title.trim(),
    description: input.description ?? null,
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    mode: input.mode,
    location: input.location ?? null,
    meeting_url: input.meetingUrl ?? null,
    organizer: input.organizer ?? null,
  });
  if (error) fail('Could not create event', error.message);
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type ReportableType =
  | 'community'
  | 'community_post'
  | 'community_comment'
  | 'community_event'
  | 'community_poll';

export async function reportContent(input: {
  targetType: ReportableType;
  targetId: string;
  reason: CommunityReportReason;
  details?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('community-actions', {
    body: {
      action: 'report',
      payload: {
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details?.trim() || null,
      },
    },
  });
  if (error) fail('Could not submit report', error.message);
  const fnError = (data as { error?: string } | null)?.error;
  if (fnError) fail('Could not submit report', fnError);
}

// ── Community creation requests ──────────────────────────────────────────────

export interface CreateRequestInput {
  name: string;
  categoryId: string;
  description: string;
  purpose: string;
  universityId?: string | null;
  departmentId?: string | null;
  rules: string[];
  imageUrl?: string | null;
}

/** Student submits a community request (admin review, rate limited). */
export async function createCommunityRequest(input: CreateRequestInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('community-actions', {
    body: {
      action: 'create_request',
      payload: {
        name: input.name.trim(),
        category_id: input.categoryId,
        description: input.description.trim(),
        purpose: input.purpose.trim(),
        university_id: input.universityId ?? null,
        department_id: input.departmentId ?? null,
        proposed_rules: input.rules.map((rule) => rule.trim()).filter(Boolean),
        image_url: input.imageUrl ?? null,
      },
    },
  });
  if (error) fail('Could not submit request', error.message);
  const fnError = (data as { error?: string } | null)?.error;
  if (fnError) fail('Could not submit request', fnError);
}

/** Hard cap for a settings-style list — not an infinite scroll feed. */
const MY_REQUESTS_LIMIT = 50;

/** The viewer's own requests (pending badge on the discovery screen). */
export async function listMyRequests(): Promise<CommunityRequest[]> {
  const viewerId = await requireUserId();
  const { data, error } = await supabase
    .from('community_requests')
    .select(
      'id, requested_by, name, description, purpose, proposed_rules, image_url, status, ' +
        'community_id, review_note, created_at, ' +
        'category:community_categories(id, name), university:universities(name)',
    )
    .eq('requested_by', viewerId)
    .order('created_at', { ascending: false })
    .limit(MY_REQUESTS_LIMIT);
  if (error) fail('Could not load your requests', error.message);

  return ((data ?? []) as unknown as {
    id: string;
    requested_by: string;
    name: string;
    description: string;
    purpose: string | null;
    proposed_rules: string[];
    image_url: string | null;
    status: CommunityRequest['status'];
    community_id: string | null;
    review_note: string | null;
    created_at: string;
    category: { id: string; name: string } | null;
    university: { name: string } | null;
  }[]).map((row) => ({
    id: row.id,
    requestedBy: row.requested_by,
    requesterName: null,
    name: row.name,
    categoryId: row.category?.id ?? null,
    categoryName: row.category?.name ?? null,
    description: row.description,
    purpose: row.purpose,
    universityName: row.university?.name ?? null,
    proposedRules: Array.isArray(row.proposed_rules) ? row.proposed_rules : [],
    imageUrl: row.image_url,
    status: row.status,
    communityId: row.community_id,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  }));
}

// ── Image uploads (community-media bucket, own-prefix policy) ────────────────

/**
 * Unique object-name suffix without a crypto dependency: Hermes ships no
 * WebCrypto, so `crypto.randomUUID()` is undefined at runtime on devices
 * and crashed the upload before it ever left the phone. See profile/avatars
 * for the same fix.
 */
let uploadCounter = 0;
function uniqueSuffix(): string {
  uploadCounter += 1;
  return `${Date.now().toString(36)}-${uploadCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * Upload a picked image to the public community-media bucket. Raw bytes, not
 * a Blob — same reason as profile avatars (RN Blob part-MIME overrides the
 * contentType option and trips the bucket whitelist).
 */
export async function uploadCommunityImage(localUri: string, mimeType: string): Promise<string> {
  const userId = await requireUserId();
  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : 'jpg';
  const path = `${userId}/${uniqueSuffix()}.${ext}`;

  const response = await fetch(localUri);
  const bytes = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from(COMMUNITY_BUCKET)
    .upload(path, bytes, { contentType: mimeType });
  if (error) fail('Could not upload image', error.message);

  const { data } = supabase.storage.from(COMMUNITY_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ── Followed topics (discovery signal) ────────────────────────────────────────

/** A topic the viewer follows. Topics are short free-text tokens matched
 *  against community.name / description / category.name by the
 *  recommended_communities SQL function. */
export interface FollowedTopic {
  topic: string;
  createdAt: string;
}

/** A static, server-agnostic suggestion list rendered in the empty state
 *  when the user has no profile data yet — same tokens are accepted by
 *  the SQL scoring, so following any of these immediately biases the
 *  recommended feed. */
export const SUGGESTED_TOPICS: readonly string[] = [
  'Engineering',
  'Career',
  'Research',
  'Programming',
  'Design',
  'Mathematics',
  'Business',
  'Robotics',
];

/** List the viewer's followed topics. */
export async function listFollowedTopics(): Promise<FollowedTopic[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('user_followed_topics')
    .select('topic, created_at')
    .order('created_at', { ascending: false });
  if (error) fail('Could not load followed topics', error.message);
  return ((data ?? []) as { topic: string; created_at: string }[]).map((row) => ({
    topic: row.topic,
    createdAt: row.created_at,
  }));
}

export async function followTopic(topic: string): Promise<void> {
  await requireUserId();
  const trimmed = topic.trim().slice(0, 40);
  if (trimmed.length < 1) return;
  // Insert with on-conflict do-nothing so re-following is safe.
  const { error } = await supabase
    .from('user_followed_topics')
    .insert({ topic: trimmed });
  if (error && error.code !== '23505') {
    fail('Could not follow topic', error.message);
  }
}

export async function unfollowTopic(topic: string): Promise<void> {
  await requireUserId();
  const { error } = await supabase
    .from('user_followed_topics')
    .delete()
    .eq('topic', topic);
  if (error) fail('Could not unfollow topic', error.message);
}
