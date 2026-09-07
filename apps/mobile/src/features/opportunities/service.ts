import { supabase } from '@/lib/supabase';
import type {
  Opportunity,
  OpportunitySummary,
  OpportunityType,
} from '@kse/types';

/**
 * Published-opportunity reads for the mobile app. RLS guarantees only
 * published rows are ever returned through the anon key; the explicit
 * status filter also keeps queries on the partial indexes.
 */

export interface OpportunityPage {
  rows: OpportunitySummary[];
  page: number;
  hasMore: boolean;
}

export class OpportunityError extends Error {}

function fail(context: string, message: string): never {
  throw new OpportunityError(`${context}: ${message}`);
}

/** One page of a type listing, soonest deadlines first. */
export async function listOpportunities(options: {
  type: OpportunityType;
  page: number;
  pageSize?: number;
}): Promise<OpportunityPage> {
  const pageSize = options.pageSize ?? 10;
  const from = (options.page - 1) * pageSize;

  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, type, title, organization_name, summary, image_url, location, opportunity_mode, deadline, featured, verified',
    )
    .eq('status', 'published')
    .eq('type', options.type)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) fail('Could not load opportunities', error.message);
  const rows = (data ?? []) as OpportunitySummary[];
  return { rows, page: options.page, hasMore: rows.length === pageSize };
}

/** Newest published opportunities across types (home "Latest"). */
export async function listLatestOpportunities(limit = 4): Promise<OpportunitySummary[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, type, title, organization_name, summary, image_url, location, opportunity_mode, deadline, featured, verified',
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) fail('Could not load opportunities', error.message);
  return (data ?? []) as OpportunitySummary[];
}

export interface OpportunityDetail extends Opportunity {
  tags: string[];
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  const [{ data: opportunity, error }, { data: tagRows, error: tagError }] =
    await Promise.all([
      supabase.from('opportunities').select('*').eq('id', id).single(),
      supabase
        .from('opportunity_tags')
        .select('tags(name)')
        .eq('opportunity_id', id),
    ]);

  if (error) fail('Could not load this opportunity', error.message);
  if (tagError) fail('Could not load this opportunity', tagError.message);

  const tags = ((tagRows ?? []) as unknown as { tags: { name: string } | null }[])
    .map((row) => row.tags?.name)
    .filter((name): name is string => Boolean(name));

  return { ...(opportunity as Opportunity), tags };
}
