import { createAdminClient } from '@/lib/supabase/admin';
import { HubForm } from '@/features/hub/hub-form';

/** Create a Student Hub listing. */
export default async function NewHubListingPage() {
  const admin = createAdminClient();
  const { data: categories } = await admin
    .from('student_hub_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        New Student Hub listing
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Directory listings are admin-managed; verification is set here and can
        never be granted by students.
      </p>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <HubForm categories={categories ?? []} />
      </div>
    </div>
  );
}
