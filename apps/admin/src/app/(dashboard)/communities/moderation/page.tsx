import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CommunityStatusControls,
  RestoreTargetButton,
} from '@/features/communities/moderation-controls';
import type { ContentStatus } from '@kse/types';

const QUEUE_SIZE = 15;

interface RemovedPostRow {
  id: string;
  content: string;
  post_type: string;
  status: ContentStatus;
  created_at: string;
  author_id: string;
  community_id: string;
  community: { name: string } | null;
}

interface RemovedCommentRow {
  id: string;
  content: string;
  status: ContentStatus;
  created_at: string;
  author_id: string;
  post_id: string;
}

interface SuspendedCommunityRow {
  id: string;
  name: string;
  slug: string;
  status: ContentStatus;
  member_count: number;
}

interface ModerationRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  actor_id: string;
}

/**
 * Moderation overview (spec §Admin panel → Moderation): removed content
 * queues, suspended communities and the recent audit trail in one place.
 */
export default async function CommunityModerationPage() {
  const admin = createAdminClient();
  const [posts, comments, communities, audits] = await Promise.all([
    admin
      .from('community_posts')
      .select(
        'id, content, post_type, status, created_at, author_id, community_id, ' +
          'community:communities(name, status)',
      )
      .neq('status', 'active')
      // Audit #9: removed posts only surface in the live queue when the
      // parent community is still active. Archived/suspended communities
      // keep their own history on /communities/[id].
      .eq('community.status', 'active')
      .order('updated_at', { ascending: false })
      .range(0, QUEUE_SIZE - 1),
    admin
      .from('community_comments')
      .select('id, content, status, created_at, author_id, post_id')
      .neq('status', 'active')
      .order('updated_at', { ascending: false })
      .range(0, QUEUE_SIZE - 1),
    admin
      .from('communities')
      .select('id, name, slug, status, member_count')
      .in('status', ['hidden', 'removed', 'archived'])
      .order('updated_at', { ascending: false })
      .range(0, QUEUE_SIZE - 1),
    admin
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at, actor_id')
      .in('entity_type', [
        'community',
        'community_request',
        'community_post',
        'community_comment',
        'community_event',
        'report',
        'community_members',
      ])
      .order('created_at', { ascending: false })
      .range(0, QUEUE_SIZE - 1),
  ]);

  const removedPosts = (posts.data ?? []) as unknown as RemovedPostRow[];
  const removedComments = (comments.data ?? []) as unknown as RemovedCommentRow[];
  const suspendedCommunities = (communities.data ?? []) as SuspendedCommunityRow[];
  const auditRows = (audits.data ?? []) as ModerationRow[];

  const userIds = Array.from(
    new Set([
      ...removedPosts.map((p) => p.author_id),
      ...removedComments.map((c) => c.author_id),
      ...auditRows.map((a) => a.actor_id),
    ]),
  );
  const { data: profiles } =
    userIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
  const names = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? 'User',
    ]),
  );

  const section = 'mt-8';
  const card = 'overflow-x-auto rounded-xl border border-zinc-200 bg-white';
  const heading =
    'text-sm font-semibold uppercase tracking-wide text-zinc-500';

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Moderation
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Removed content keeps moderation history — restore or delete for good.
      </p>

      <h2 className={heading}>
        Suspended &amp; archived communities · {suspendedCommunities.length}
      </h2>
      <div className={`${section.replace('mt-8', 'mt-2')} ${card}`}>
        {suspendedCommunities.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">
            Every community is active.{' '}
            <Link href="/communities" className="text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Community</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suspendedCommunities.map((community) => (
                <tr
                  key={community.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/communities/${community.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {community.name}
                    </Link>
                    <div className="text-xs text-zinc-400">/{community.slug}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-600">{community.status}</td>
                  <td className="px-4 py-3 text-zinc-600">{community.member_count}</td>
                  <td className="px-4 py-3">
                    <CommunityStatusControls
                      communityId={community.id}
                      current={community.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className={section.concat(' ', heading)}>
        Removed posts · {removedPosts.length}
      </h2>
      <div className="mt-2">
        {removedPosts.length === 0 ? (
          <div className={`${card} p-6 text-sm text-zinc-500`}>No removed posts.</div>
        ) : (
          <div className="space-y-2">
            {removedPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">
                    {post.community?.name ?? 'Community'} ·{' '}
                    {names.get(post.author_id) ?? 'User'} · {formatDate(post.created_at)} ·{' '}
                    <span className="capitalize">{post.status}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{post.content}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <RestoreTargetButton
                    contentType="community_post"
                    id={post.id}
                    label="Restore"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className={section.concat(' ', heading)}>
        Removed comments · {removedComments.length}
      </h2>
      <div className="mt-2">
        {removedComments.length === 0 ? (
          <div className={`${card} p-6 text-sm text-zinc-500`}>No removed comments.</div>
        ) : (
          <div className="space-y-2">
            {removedComments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">
                    {names.get(comment.author_id) ?? 'User'} ·{' '}
                    {formatDate(comment.created_at)} ·{' '}
                    <span className="capitalize">{comment.status}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                    {comment.content}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <RestoreTargetButton
                    contentType="community_comment"
                    id={comment.id}
                    label="Restore"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className={section.concat(' ', heading)}>
        Recent moderation activity
      </h2>
      <div className="mt-2">
        {auditRows.length === 0 ? (
          <div className={`${card} p-6 text-sm text-zinc-500`}>
            No moderation activity yet.
          </div>
        ) : (
          <div className={card}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Entity ID</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {names.get(row.actor_id) ?? 'System'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                      {row.action}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{row.entity_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {row.entity_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
