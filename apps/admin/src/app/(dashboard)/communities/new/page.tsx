import Link from 'next/link';

import { CommunityForm } from '@/features/communities/community-form';
import type { CommunityUniversityOption } from '@/features/communities/community-form';
import { createAdminClient } from '@/lib/supabase/admin';

/** Create a community (spec §7) — admins curate communities; students join. */
export default async function NewCommunityPage() {
  const admin = createAdminClient();
  const { data: universities } = await admin
    .from('universities')
    .select('id, name')
    .order('name');

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
          Communities appear in the mobile app once active. Membership grows as
          students join; announcements and moderation stay on the detail screen.
        </p>
      </div>

      <CommunityForm
        universities={(universities ?? []) as unknown as CommunityUniversityOption[]}
      />
    </div>
  );
}
