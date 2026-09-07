import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmSubmit } from '@/components/confirm-submit';
import { StatusBadge } from '@/components/status-badge';
import { deleteOpportunityAction, setStatusAction } from '@/features/opportunities/actions';
import { OpportunityForm } from '@/features/opportunities/opportunity-form';
import type {
  CategoryOption,
  OpportunityFormData,
} from '@/features/opportunities/types';
import { formatDateTime, toDateTimeLocal } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { OPPORTUNITY_TYPE_LABELS } from '@kse/shared';
import type { Opportunity } from '@kse/types';

const QUICK_ACTIONS = [
  { status: 'published', label: 'Publish now', className: 'bg-emerald-600 text-white hover:bg-emerald-500' },
  { status: 'pending_review', label: 'Send to review', className: 'bg-amber-500 text-white hover:bg-amber-400' },
  { status: 'draft', label: 'Move to draft', className: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100' },
  { status: 'archived', label: 'Archive', className: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100' },
] as const;

export default async function EditOpportunityPage({
  params,
}: PageProps<'/opportunities/[id]'>) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data, error }, { data: categories }, { data: tagData }] =
    await Promise.all([
      admin.from('opportunities').select('*').eq('id', id).single(),
      admin
        .from('opportunity_categories')
        .select('id, name, opportunity_type')
        .order('sort_order')
        .order('name'),
      admin
        .from('opportunity_tags')
        .select('tags(name)')
        .eq('opportunity_id', id),
    ]);

  const opportunity = data as Opportunity | null;
  const tagRows = (tagData ?? []) as unknown as { tags: { name: string } | null }[];

  if (error || !opportunity) {
    notFound();
  }

  const formData: OpportunityFormData = {
    id: opportunity.id,
    type: opportunity.type,
    title: opportunity.title,
    organization_name: opportunity.organization_name,
    summary: opportunity.summary ?? '',
    description: opportunity.description ?? '',
    image_url: opportunity.image_url ?? '',
    location: opportunity.location ?? '',
    opportunity_mode: opportunity.opportunity_mode ?? '',
    eligibility: opportunity.eligibility ?? '',
    application_url: opportunity.application_url ?? '',
    deadline: toDateTimeLocal(opportunity.deadline),
    degree_level: opportunity.degree_level ?? '',
    funding_type: opportunity.funding_type ?? '',
    country: opportunity.country ?? '',
    category_id: opportunity.category_id ?? '',
    status: opportunity.status,
    featured: opportunity.featured,
    verified: opportunity.verified,
    source_name: opportunity.source_name ?? '',
    source_url: opportunity.source_url ?? '',
    tags: tagRows
      .map((row) => row.tags?.name)
      .filter((name): name is string => Boolean(name)),
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/opportunities" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Opportunities
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {opportunity.title}
          </h1>
          <StatusBadge status={opportunity.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {OPPORTUNITY_TYPE_LABELS[opportunity.type]} · {opportunity.organization_name} ·
          updated {formatDateTime(opportunity.updated_at)}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {QUICK_ACTIONS.filter((action) => action.status !== opportunity.status).map(
          (action) => (
            <form key={action.status} action={setStatusAction}>
              <input type="hidden" name="id" value={opportunity.id} />
              <input type="hidden" name="status" value={action.status} />
              <button
                type="submit"
                className={`h-9 rounded-lg px-4 text-sm font-medium transition ${action.className}`}
              >
                {action.label}
              </button>
            </form>
          ),
        )}
      </div>

      <OpportunityForm
        categories={(categories ?? []) as CategoryOption[]}
        opportunity={formData}
      />

      <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 text-sm text-red-600">
          Deleting removes the listing and its tags/saves permanently.
        </p>
        <form action={deleteOpportunityAction} className="mt-3">
          <input type="hidden" name="id" value={opportunity.id} />
          <ConfirmSubmit
            label="Delete opportunity"
            message={`Delete "${opportunity.title}" permanently?`}
            className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500"
          />
        </form>
      </div>
    </div>
  );
}
