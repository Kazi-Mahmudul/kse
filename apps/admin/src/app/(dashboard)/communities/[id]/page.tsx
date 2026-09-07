import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CommunityStatusToggle,
  DeleteCommunityPostButton,
} from '@/features/communities/moderation-controls';
import type { ContentStatus } from '@kse/types';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ContentStatus;
  university: { name: string } | null;
}

interface MembershipRow {
  user_id: string;
  role: 'member' | 'moderator' | 'owner';
  joined_at: string;
}

interface PostRow {
  id: string;
  content: string;
  is_announcement: boolean;
  status: ContentStatus;
  created_at: string;
  author_id: string;
}

const PAGE_SIZE = 50;

export default async function CommunityDetailPage({
  params,
}: PageProps<'/communities/[id]'>) {
  const { id } = await params;

  const admin = createAdminClient();
  const [{ data: community, error: communityError }, { data: members }, { data: posts }] =
    await Promise.all([
      admin
        .from('communities')
        .select('id, name, slug, description, status, university:universities(name)')
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
          'id, content, is_announcement, status, created_at, author_id',
        )
        .eq('community_id', id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
    ]);

  if (communityError || !community) {
    notFound();
  }

  const c = community as unknown as CommunityRow;
  const memberRows = (members ?? []) as MembershipRow[];
  const postRows = (posts ?? []) as PostRow[];

  const authorIds = Array.from(new Set([...memberRows.map((m) => m.user_id), ...postRows.map((p) => p.author_id)]));
  const { data: profileRows } =
    authorIds.length > 0
      ? await admin.from('profiles').select('id, full_name').in('id', authorIds)
      : { data: [] };
  const names = new Map(
    ((profileRows ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? 'User',
    ]),
  );

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
            {c.university?.name ? ` · ${c.university.name}` : ''}
          </p>
        </div>
        <CommunityStatusToggle communityId={c.id} current={c.status} />
      </div>

      {c.description && (
        <p className="mt-4 text-sm text-zinc-600">{c.description}</p>
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
                  <td className="px-4 py-3 text-zinc-600">{member.role}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(member.joined_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Action</th>
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
                    {post.is_announcement ? (
                      <span className="inline-block whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Announcement
                      </span>
                    ) : (
                      <span className="inline-block whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                        Post
                      </span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3 text-zinc-600">
                    <span className="line-clamp-2">{post.content}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {formatDate(post.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <DeleteCommunityPostButton postId={post.id} />
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
