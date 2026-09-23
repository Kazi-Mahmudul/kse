import Link from 'next/link';

import { CommunityForm } from '@/features/communities/community-form';
import type {
  CommunityCategoryOption,
  CommunityDepartmentOption,
  CommunityUniversityOption,
} from '@/features/communities/community-form';
import { createAdminClient } from '@/lib/supabase/admin';

/** Create a community (spec §7) — admins curate communities; students join. */
export default async function NewCommunityPage() {
  const admin = createAdminClient();
  const [{ data: universities }, { data: categories }, { data: departments }] =
    await Promise.all([
      admin.from('universities').select('id, name').order('name'),
      admin.from('community_categories').select('id, name').order('sort_order'),
      admin
        .from('departments')
        .select('id, name, university_id')
        .order('name'),
    ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/communities" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Communities
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          New community
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Communities appear in the mobile app once active. Prefer approving
          student requests on the{' '}
          <Link href="/communities/pending" className="text-indigo-600 hover:underline">
            pending list
          </Link>{' '}
          — use this form only for platform-run communities.
        </p>
      </div>

      <CommunityForm
        universities={(universities ?? []) as unknown as CommunityUniversityOption[]}
        categories={(categories ?? []) as unknown as CommunityCategoryOption[]}
        departments={(departments ?? []) as unknown as CommunityDepartmentOption[]}
      />
    </div>
  );
}
