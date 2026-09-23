import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatDate, formatDateTime } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CommunityStatusControls,
  DeleteCommunityPostButton,
  MemberRoleControls,
  RemoveCommunityContentButton,
  RemoveMemberButton,
} from '@/features/communities/moderation-controls';
import type { ContentStatus } from '@kse/types';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ContentStatus;
  member_count: number;
  university: { name: string } | null;
  category: { name: string } | null;
}

interface MembershipRow {
  user_id: string;
  role: 'member' | 'moderator' | 'owner';
  joined_at: string;
}

interface PostRow {
  id: string;
  content: string;
  post_type: string;
  status: ContentStatus;
  is_pinned: boolean;
  is_locked: boolean;
  comment_count: number;
  reaction_count: number;
  created_at: string;
  author_id: string;
}

interface EventRow {
  id: string;
  title: string;
  mode: string;
  starts_at: string;
  status: ContentStatus;
  created_at: string;
}

interface RuleRow {
  id: string;
  content: string;
  sort_order: number;
}

const PAGE_SIZE = 50;

const STATUS_PILLS: Record<ContentStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  hidden: 'bg-amber-50 text-amber-700',
  removed: 'bg-zinc-100 text-zinc-600',
  archived: 'bg-zinc-100 text-zinc-600',
};

/**
 * Community detail (spec §7 + redesign): members with moderator management,
 * rules, typed posts with soft-remove, and community events.
 */
export default async function CommunityDetailPage({
  params,
}: PageProps<'/communities/[id]'>) {
  const { id } = await params;

  const admin = createAdminClient();
  const [communityResult, membersResult, postsResult, eventsResult, rulesResult] =
    await Promise.all([
      admin
        .from('communities')
        .select(
          'id, name, slug, description, status, member_count, ' +
            'university:universities(name), category:community_categories(name)',
        )
        .eq('id', id)
        .maybeSingle(),
      admin
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', id)
        .order('joined_at', { ascending: false }),
      admin
        .from('community_posts')
        .select(
          'id, content, post_type, status, is_pinned, is_locked, comment_count, ' +
            'reaction_count, created_at, author_id',
        )
        .eq('community_id', id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
      admin
        .from('community_events')
        .select('id, title, mode, starts_at, status, created_at')
        .eq('community_id', id)
        .order('starts_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
      admin
        .from('community_rules')
        .select('id, content, sort_order')
        .eq('community_id', id)
        .order('sort_order'),
    ]);

  if (communityResult.error || !communityResult.data) {
    notFound();
  }

  const c = communityResult.data as unknown as CommunityRow;
  const memberRows = (membersResult.data ?? []) as MembershipRow[];
  const postRows = (postsResult.data ?? []) as PostRow[];
  const eventRows = (eventsResult.data ?? []) as EventRow[];
  const ruleRows = (rulesResult.data ?? []) as RuleRow[];

  const userIds = Array.from(
    new Set([
      ...memberRows.map((m) => m.user_id),
      ...postRows.map((p) => p.author_id),
    ]),
  );
  const { data: profileRows } =
    userIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
  const names = new Map(
    ((profileRows ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? 'User',
    ]),
  );

  const moderators = memberRows.filter((m) => m.role !== 'member');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/communities"
            className="text-xs text-zinc-500 transition hover:text-zinc-800"
          >
            ← Back to communities
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {c.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            /{c.slug}
            {c.category?.name ? ` · ${c.category.name}` : ''}
            {c.university?.name ? ` · ${c.university.name}` : ''} ·{' '}
            {c.member_count} member{c.member_count === 1 ? '' : 's'}
          </p>
        </div>
        <CommunityStatusControls communityId={c.id} current={c.status} />
      </div>

      {c.description && <p className="mt-4 text-sm text-zinc-600">{c.description}</p>}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Rules · {ruleRows.length}
      </h2>
      {ruleRows.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No rules defined.</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
          {ruleRows.map((rule) => (
            <li key={rule.id}>{rule.content}</li>
          ))}
        </ol>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Members · {memberRows.length}
      </h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {memberRows.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">No members yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberRows.map((member) => (
                <tr
                  key={member.user_id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {names.get(member.user_id) ?? 'Member'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.role === 'owner'
                          ? 'bg-indigo-50 text-indigo-700'
                          : member.role === 'moderator'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(member.joined_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MemberRoleControls
                        communityId={c.id}
                        userId={member.user_id}
                        role={member.role}
                      />
                      <RemoveMemberButton communityId={c.id} userId={member.user_id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {moderators.length} moderator{moderators.length === 1 ? '' : 's'} (incl. owner) —
        moderators can pin, lock and remove content in the app.
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Posts · {postRows.length}
      </h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {postRows.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">No posts yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Content</th>
                <th className="px-4 py-3 font-medium">Engagement</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {postRows.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {names.get(post.author_id) ?? 'Member'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-600">
                        {post.post_type}
                      </span>
                      {post.is_pinned && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                          pinned
                        </span>
                      )}
                      {post.is_locked && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          locked
                        </span>
                      )}
                      {post.status !== 'active' && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_PILLS[post.status]}`}
                        >
                          {post.status}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3 text-zinc-600">
                    <span className="line-clamp-2">{post.content}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {post.reaction_count} ❤ · {post.comment_count} 💬
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(post.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {post.status === 'active' ? (
                        <RemoveCommunityContentButton
                          contentType="community_post"
                          contentId={post.id}
                          label="Remove"
                        />
                      ) : null}
                      <DeleteCommunityPostButton postId={post.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Events · {eventRows.length}
      </h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {eventRows.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">No events yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Starts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventRows.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{event.title}</td>
                  <td className="px-4 py-3 capitalize text-zinc-600">{event.mode}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {formatDateTime(event.starts_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILLS[event.status]}`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {event.status === 'active' ? (
                      <RemoveCommunityContentButton
                        contentType="community_event"
                        contentId={event.id}
                        label="Remove"
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
