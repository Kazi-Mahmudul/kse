import Link from 'next/link';

import { OpportunityForm } from '@/features/opportunities/opportunity-form';
import type { CategoryOption } from '@/features/opportunities/types';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function NewOpportunityPage() {
  const admin = createAdminClient();
  const { data: categories } = await admin
    .from('opportunity_categories')
    .select('id, name, opportunity_type')
    .order('sort_order')
    .order('name');

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/opportunities" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Opportunities
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          New opportunity
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Save as draft while writing, then publish when it is ready (spec §21).
        </p>
      </div>

      <OpportunityForm categories={(categories ?? []) as CategoryOption[]} />
    </div>
  );
}
