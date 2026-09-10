import { supabase } from '@/lib/supabase';
import type {
  CommunityDetail,
  CommunityListItem,
  CommunityMemberRole,
  CommunityPost,
  CommunityRecentPost,
} from '@kse/types';

/**
 * Communities (spec §6 "Community") — discovery + membership + posts.
 * communities↔profiles share no FK (both reference auth.users) so author
 * names are merged in a second query (same pattern as tutors, step 15).
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
  if (error || !user) fail('Could not load community', 'You need to sign in first');
  return user.id;
}

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  status: CommunityDetail['status'];
  university: { name: string } | null;
  community_members: { user_id: string; role: CommunityMemberRole }[];
}

const COMMUNITY_SELECT =
  'id, name, slug, description, cover_image_url, status, university:universities(name), ' +
  'community_members(user_id, role)';

function summarize(row: CommunityRow, viewerId: string | null): CommunityListItem {
  const membership = row.community_members.find((m) => m.user_id === viewerId);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    universityName: row.university?.name ?? null,
    memberCount: row.community_members.length,
    isMember: Boolean(membership),
    role: membership?.role ?? null,
  };
}

/** Active communities for the discovery tab (newest first). */
export async function fetchCommunities(): Promise<CommunityListItem[]> {
  const viewerId = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { data, error } = await supabase
    .from('communities')
    .select(COMMUNITY_SELECT)
    .eq('status', 'active')
    .order('name');

  if (error) fail('Could not load communities', error.message);

  return ((data ?? []) as unknown as CommunityRow[]).map((row) =>
    summarize(row, viewerId),
  );
}

/** Single community for the detail screen header. */
export async function getCommunity(id: string): Promise<CommunityDetail> {
  const viewerId = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { data, error } = await supabase
    .from('communities')
    .select(COMMUNITY_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) fail('Could not load this community', error.message);
  if (!data) fail('Could not load this community', 'Community not found');

  const row = data as unknown as CommunityRow;
  return { ...summarize(row, viewerId), status: row.status };
}

interface MembershipRow {
  community_id: string;
  user_id: string;
  role: CommunityMemberRole;
}

/** Ids of every active community the current user has joined (toggle state). */
export async function listJoinedCommunityIds(): Promise<string[]> {
  const viewerId = await requireUserId();

  const { data, error } = await supabase
    .from('community_members')
    .select('community_id, user_id')
    .eq('user_id', viewerId);

  if (error) fail('Could not load joined communities', error.message);
  return ((data ?? []) as Pick<MembershipRow, 'community_id' | 'user_id'>[]).map(
    (row) => row.community_id,
  );
}

/** Join the community as a member. RLS enforces role=member + active. */
export async function joinCommunity(communityId: string): Promise<void> {
  const viewerId = await requireUserId();

  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: viewerId, role: 'member' });

  if (error) fail('Could not join community', error.message);
}

/** Self-service leave (RLS only allows member role to delete own row). */
export async function leaveCommunity(communityId: string): Promise<void> {
  const viewerId = await requireUserId();

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', viewerId)
    .eq('role', 'member');

  if (error) fail('Could not leave community', error.message);
}

interface PostRow {
  id: string;
  community_id: string;
  author_id: string;
  content: string;
  is_announcement: boolean;
  status: CommunityPost['status'];
  created_at: string;
}

async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);
  if (error) fail('Could not load posts', error.message);
  const names = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; full_name: string | null }[]) {
    names.set(row.id, row.full_name ?? 'Member');
  }
  return names;
}

function toPost(row: PostRow, name: string): CommunityPost {
  return {
    id: row.id,
    communityId: row.community_id,
    authorId: row.author_id,
    authorName: name,
    content: row.content,
    isAnnouncement: row.is_announcement,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Posts in a community, newest first; merged with author names. */
export async function listCommunityPosts(communityId: string): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, community_id, author_id, content, is_announcement, status, created_at')
    .eq('community_id', communityId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) fail('Could not load posts', error.message);

  const rows = (data ?? []) as unknown as PostRow[];
  const names = await fetchProfileNames(rows.map((row) => row.author_id));
  return rows.map((row) => toPost(row, names.get(row.author_id) ?? 'Member'));
}

/**
 * Latest active posts across every community, newest first. Drives the
 * "Recent Discussions" section on the Community tab (spec 09._community_kse).
 * Parent community name is embedded on the row so the card can render the
 * "Author in Community" line without an extra round-trip; author display
 * names are merged from `profiles` in a second query, same pattern as
 * `listCommunityPosts`.
 */
export async function listRecentPosts(limit = 8): Promise<CommunityRecentPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(
      'id, community_id, author_id, content, is_announcement, status, created_at, ' +
        'community:communities!inner(name, status)',
    )
    .eq('status', 'active')
    .eq('community.status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) fail('Could not load recent discussions', error.message);

  interface RowWithCommunity extends PostRow {
    community: { name: string; status: string } | null;
  }
  const rows = (data ?? []) as unknown as RowWithCommunity[];
  const names = await fetchProfileNames(rows.map((row) => row.author_id));
  return rows.map((row) => ({
    ...toPost(row, names.get(row.author_id) ?? 'Member'),
    communityName: row.community?.name ?? 'Community',
  }));
}

/** Creates a post; RLS gates membership + announcement role. */
export async function createCommunityPost(input: {
  community_id: string;
  content: string;
  is_announcement: boolean;
}): Promise<void> {
  const viewerId = await requireUserId();

  const { error } = await supabase.from('community_posts').insert({
    community_id: input.community_id,
    author_id: viewerId,
    content: input.content.trim(),
    is_announcement: input.is_announcement,
  });
  if (error) fail('Could not post', error.message);
}

/** Authors and moderators can delete their own posts. */
export async function deleteCommunityPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);
  if (error) fail('Could not delete post', error.message);
}
