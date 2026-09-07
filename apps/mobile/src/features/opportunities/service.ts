import { supabase } from '@/lib/supabase';
import type {
  Opportunity,
  OpportunityMode,
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

/** Filter set shared by the search screen and per-type listings. */
export interface OpportunityFilters {
  /** Free-text query → search_vector full-text search. */
  q?: string;
  type?: OpportunityType;
  mode?: OpportunityMode;
  /** Only opportunities whose deadline falls within N days (and is ahead). */
  deadlineWithinDays?: number | null;
}

export class OpportunityError extends Error {}

function fail(context: string, message: string): never {
  throw new OpportunityError(`${context}: ${message}`);
}

/** Strips tsquery operators; \p{L} keeps Bangla and English words. */
export function sanitizeSearchQuery(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
}

const SUMMARY_SELECT =
  'id, type, title, organization_name, summary, image_url, location, opportunity_mode, deadline, featured, verified';

/** One page of opportunities matching text + filters, soonest deadline first. */
export async function fetchOpportunities(
  filters: OpportunityFilters,
  page: number,
  pageSize = 10,
): Promise<OpportunityPage> {
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('opportunities')
    .select(SUMMARY_SELECT)
    .eq('status', 'published');

  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.mode) {
    query = query.eq('opportunity_mode', filters.mode);
  }
  if (filters.deadlineWithinDays) {
    const now = new Date().toISOString();
    const until = new Date(
      Date.now() + filters.deadlineWithinDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte('deadline', now).lte('deadline', until);
  }
  const sanitized = filters.q ? sanitizeSearchQuery(filters.q) : '';
  if (sanitized) {
    // PostgREST v16 parenthesizes the tsquery config (`plfts(simple).q`);
    // postgrest-js textSearch() still emits the old dot form, which silently
    // matches nothing there — so build the operator ourselves.
    query = query.filter('search_vector', 'plfts(simple)', sanitized);
  }

  const { data, error } = await query
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) fail('Could not load opportunities', error.message);
  const rows = (data ?? []) as OpportunitySummary[];
  return { rows, page, hasMore: rows.length === pageSize };
}

/** Newest published opportunities across types (home "Latest"). */
export async function listLatestOpportunities(limit = 4): Promise<OpportunitySummary[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(SUMMARY_SELECT)
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
